// Copyright 2024 VoteChain Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#![no_std]

mod events;
mod storage;
mod types;

#[cfg(test)]
mod prop_tests;
#[cfg(test)]
mod test;
#[cfg(test)]
pub mod test_helpers;

use soroban_sdk::{contract, contractclient, contractimpl, token, Address, Env, String, Vec};
use storage::{
    clear_pending_admin, get_admin, get_admin_transfer_expiry, get_contract_state,
    get_last_proposal, get_max_duration, get_min_duration, get_min_proposal_balance,
    get_multisig_admins, get_multisig_threshold, get_pending_action, get_pending_admin,
    get_proposal_cooldown, get_restrict_admin_vote, get_timelock_duration, get_version,
    get_vote_record, get_voter_snapshot, get_voting_token, has_voted, is_initialized, is_multisig,
    is_paused, load_proposal, mark_voted, next_action_id, next_id, remove_pending_action,
    save_pending_action, save_proposal, save_vote_record, save_voter_snapshot, set_admin,
    set_admin_transfer_expiry, set_contract_state, set_last_proposal, set_max_duration,
    set_min_duration, set_min_proposal_balance, set_multisig_admins, set_multisig_threshold,
    set_paused, set_pending_admin, set_proposal_cooldown, set_restrict_admin_vote,
    set_timelock_duration, set_version, set_voting_token,
};
use types::{
    ContractError, ContractState, DataKey, MultisigAction, PendingMultisigAction, Proposal,
    ProposalState, Vote, VoteRecord,
};

const MAX_TITLE_LEN: u32 = 128;
const MAX_DESC_LEN: u32 = 1024;

// SEC-004: Stellar null/zero address used as the sentinel for invalid inputs.
const ZERO_ADDRESS: &str = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

// SEC-003: Maximum buffer size for byte-level string validation (matches MAX_DESC_LEN).
const MAX_VALIDATE_BUF: usize = 1024;

/// SEC-003: Validates that a Soroban `String` contains only printable UTF-8 bytes.
///
/// Rejects any byte that is a C0 control character (< 0x20), a null byte (0x00),
/// or the DEL character (0x7F). This prevents injection of control sequences that
/// could corrupt off-chain indexers or log parsers.
///
/// # Errors
/// Returns `err` if any byte in `s` fails the printable-ASCII check.
fn validate_string(s: &String, err: ContractError) -> Result<(), ContractError> {
    let len = s.len() as usize;
    // Stack buffer — len is already bounded by the caller's length check.
    let mut buf = [0u8; MAX_VALIDATE_BUF];
    s.copy_into_slice(&mut buf[..len]);
    for &b in &buf[..len] {
        if b < 0x20 || b == 0x7F {
            return Err(err);
        }
    }
    Ok(())
}

// SEC-004: Rejects the Stellar zero/default address on any address parameter.
fn require_non_zero_address(env: &Env, addr: &Address) -> Result<(), ContractError> {
    if *addr == Address::from_str(env, ZERO_ADDRESS) {
        return Err(ContractError::InvalidAddress);
    }
    Ok(())
}

/// Minimal client for querying the governance token's total supply.
#[contractclient(name = "TokenSupplyClient")]
pub trait TokenSupplyInterface {
    fn total_supply(env: Env) -> i128;
}

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    /// Initialises the governance contract with an admin and a voting token.
    ///
    /// Must be called exactly once before any other function.
    ///
    /// # Parameters
    /// - `min_duration`: minimum allowed voting duration in seconds (e.g., 3600 for 1 hour)
    /// - `max_duration`: maximum allowed voting duration in seconds (e.g., 2592000 for 30 days)
    /// - `restrict_admin_vote`: when `true`, the admin address cannot cast votes on proposals
    ///   they created, preventing a conflict of interest.
    /// - `timelock_duration`: mandatory delay in seconds between a proposal passing and it
    ///   becoming executable. Use `0` to disable the timelock.
    ///
    /// # Errors
    /// - [`ContractError::AlreadyInitialized`] if the contract has already been initialised.
    /// - [`ContractError::InvalidAddress`] if `admin` or `voting_token` is the zero address.
    pub fn initialize(
        env: Env,
        admin: Address,
        voting_token: Address,
        min_proposal_balance: i128,
        proposal_cooldown: u64,
        min_duration: u64,
        max_duration: u64,
        restrict_admin_vote: bool,
        timelock_duration: u64,
    ) -> Result<(), ContractError> {
        // SEC-005: auth is the first operation in every privileged function.
        admin.require_auth();
        // SEC-004: reject zero addresses before any state change.
        require_non_zero_address(&env, &admin)?;
        require_non_zero_address(&env, &voting_token)?;
        if is_initialized(&env) {
            return Err(ContractError::AlreadyInitialized);
        }
        set_admin(&env, &admin);
        set_voting_token(&env, &voting_token);
        if min_proposal_balance > 0 {
            set_min_proposal_balance(&env, min_proposal_balance);
        }
        if proposal_cooldown > 0 {
            set_proposal_cooldown(&env, proposal_cooldown);
        }
        set_min_duration(&env, min_duration);
        set_max_duration(&env, max_duration);
        set_restrict_admin_vote(&env, restrict_admin_vote);
        if timelock_duration > 0 {
            set_timelock_duration(&env, timelock_duration);
        }
        set_version(&env, (1, 0, 0));
        set_contract_state(&env, &ContractState::Ready);
        events::contract_initialized(&env, &admin);
        Ok(())
    }

    /// Creates a new governance proposal.
    ///
    /// # Returns
    /// The numeric ID assigned to the new proposal.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if `proposer` is the zero address.
    /// - [`ContractError::InvalidTitle`] if `title` is empty or exceeds 256 characters.
    /// - [`ContractError::InvalidDescription`] if `description` is empty or exceeds 4096 characters.
    /// - [`ContractError::InvalidQuorum`] if `quorum` is zero or negative.
    /// - [`ContractError::QuorumExceedsSupply`] if `quorum` exceeds the total token supply.
    /// - [`ContractError::InvalidDurationRange`] if `duration` is outside the configured [min_duration, max_duration] range.
    /// - [`ContractError::InsufficientBalance`] if proposer balance is below minimum.
    /// - [`ContractError::ProposalCooldown`] if proposer is within cooldown period.
    /// - [`ContractError::ProposalCountOverflow`] if the proposal ID counter would overflow.
    pub fn create_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        quorum: i128,
        duration: u64,
    ) -> Result<u64, ContractError> {
        // SEC-005: auth first.
        proposer.require_auth();
        // SEC-004: reject zero address.
        require_non_zero_address(&env, &proposer)?;
        if is_paused(&env) {
            return Err(ContractError::ContractPaused);
        }

        // Title: non-empty, max 128 chars, printable bytes only (SEC-003)
        let title_len = title.len();
        if title_len == 0 || title_len > MAX_TITLE_LEN {
            return Err(ContractError::InvalidTitle);
        }
        validate_string(&title, ContractError::InvalidTitle)?;
        // Description: non-empty, max 1024 chars, printable bytes only (SEC-003)
        let desc_len = description.len();
        if desc_len == 0 || desc_len > MAX_DESC_LEN {
            return Err(ContractError::InvalidDescription);
        }
        validate_string(&description, ContractError::InvalidDescription)?;
        // Quorum: > 0
        if quorum <= 0 {
            return Err(ContractError::InvalidQuorum);
        }
        // Duration: zero is explicitly rejected before the range check so callers
        // receive InvalidDuration (not InvalidDurationRange) for the zero case.
        if duration == 0 {
            return Err(ContractError::InvalidDuration);
        }
        // Duration: within [min_duration, max_duration] as configured at init.
        let min_dur = get_min_duration(&env);
        let max_dur = get_max_duration(&env);
        if duration < min_dur || duration > max_dur {
            return Err(ContractError::InvalidDurationRange);
        }

        let token_client = token::Client::new(&env, &get_voting_token(&env)?);

        // Quorum must not exceed total token supply
        let supply = TokenSupplyClient::new(&env, &get_voting_token(&env)?).total_supply();
        if quorum > supply {
            return Err(ContractError::QuorumExceedsSupply);
        }

        let min_balance = get_min_proposal_balance(&env);
        if min_balance > 0 {
            let balance = token_client.balance(&proposer);
            if balance < min_balance {
                return Err(ContractError::InsufficientBalance);
            }
        }

        let cooldown = get_proposal_cooldown(&env);
        if cooldown > 0 {
            let now = env.ledger().timestamp();
            let last = get_last_proposal(&env, &proposer);
            if last > 0 && now < last + cooldown {
                return Err(ContractError::ProposalCooldown);
            }
        }

        let now = env.ledger().timestamp();
        // SEC-007: ID is generated contract-side only; checked_add prevents overflow.
        let id = next_id(&env)?;
        let proposal = Proposal {
            id,
            proposer: proposer.clone(),
            title,
            description,
            votes_yes: 0,
            votes_no: 0,
            votes_abstain: 0,
            quorum,
            start_time: now,
            end_time: now + duration,
            state: ProposalState::Active,
            execute_after: 0,
        };
        save_proposal(&env, &proposal);
        set_last_proposal(&env, &proposer, now);
        events::proposal_created(&env, id, &proposer);
        Ok(id)
    }

    /// Casts a vote on an active proposal.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if `voter` is the zero address.
    /// - [`ContractError::ProposalNotFound`] if `proposal_id` does not exist.
    /// - [`ContractError::ProposalNotActive`] if the proposal is not in `Active` status.
    /// - [`ContractError::VotingNotStarted`] if the current ledger timestamp is before `start_time`.
    /// - [`ContractError::VotingPeriodEnded`] if the current ledger timestamp is after `end_time`.
    /// - [`ContractError::AlreadyVoted`] if the voter has already voted on this proposal.
    /// - [`ContractError::NoVotingPower`] if the voter's token balance is zero.
    /// - [`ContractError::VoteTallyOverflow`] if adding the vote weight would overflow `i128`.
    /// - [`ContractError::AdminVoteRestricted`] if `restrict_admin_vote` is enabled and the admin
    ///   attempts to vote on a proposal they created.
    /// - [`ContractError::ContractPaused`] if the contract is paused.
    pub fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        vote: Vote,
    ) -> Result<(), ContractError> {
        // SEC-005: auth first.
        voter.require_auth();
        // SEC-004: reject zero address.
        require_non_zero_address(&env, &voter)?;
        if is_paused(&env) {
            return Err(ContractError::ContractPaused);
        }

        let proposal = load_proposal(&env, proposal_id)?;
        if proposal.state != ProposalState::Active {
            return Err(ContractError::ProposalNotActive);
        }

        let now = env.ledger().timestamp();
        if now < proposal.start_time {
            return Err(ContractError::VotingNotStarted);
        }
        if now >= proposal.end_time {
            return Err(ContractError::VotingPeriodEnded);
        }
        if has_voted(&env, proposal_id, &voter) {
            return Err(ContractError::AlreadyVoted);
        }

        if get_restrict_admin_vote(&env) {
            let admin = get_admin(&env)?;
            if voter == admin && proposal.proposer == admin {
                return Err(ContractError::AdminVoteRestricted);
            }
        }

        let token_client = token::Client::new(&env, &get_voting_token(&env)?);
        // Snapshot: capture the voter's balance at vote time and persist it.
        // Using the stored snapshot (rather than re-querying) prevents any
        // balance manipulation after the vote is recorded.
        let weight = match get_voter_snapshot(&env, proposal_id, &voter) {
            Some(w) => w,
            None => {
                let live = token_client.balance(&voter);
                save_voter_snapshot(&env, proposal_id, &voter, live);
                live
            }
        };
        if weight <= 0 {
            return Err(ContractError::NoVotingPower);
        }

        let mut proposal = proposal;
        match vote {
            Vote::Yes => {
                proposal.votes_yes = proposal
                    .votes_yes
                    .checked_add(weight)
                    .ok_or(ContractError::VoteTallyOverflow)?
            }
            Vote::No => {
                proposal.votes_no = proposal
                    .votes_no
                    .checked_add(weight)
                    .ok_or(ContractError::VoteTallyOverflow)?
            }
            Vote::Abstain => {
                proposal.votes_abstain = proposal
                    .votes_abstain
                    .checked_add(weight)
                    .ok_or(ContractError::VoteTallyOverflow)?
            }
        }

        mark_voted(&env, proposal_id, &voter);
        save_vote_record(
            &env,
            proposal_id,
            &voter,
            &VoteRecord {
                vote_type: vote.clone(),
                weight,
            },
        );
        save_proposal(&env, &proposal);
        events::vote_cast(&env, proposal_id, &voter, &vote, weight);
        Ok(())
    }

    /// Returns the vote record (type and weight) for a specific voter on a proposal.
    ///
    /// Returns `None` for non-voters without reverting. Read-only.
    pub fn get_vote(env: Env, proposal_id: u64, voter: Address) -> Option<VoteRecord> {
        get_vote_record(&env, proposal_id, &voter)
    }

    /// Finalises a proposal after its voting period has ended.
    ///
    /// Computes the outcome using the following rules:
    ///
    /// ```text
    /// total_votes = votes_yes + votes_no + votes_abstain
    ///
    /// Passed   if total_votes >= quorum AND votes_yes > votes_no
    /// Rejected otherwise (quorum not met, or votes_yes <= votes_no)
    /// ```
    ///
    /// Abstain votes count toward the quorum threshold but do not influence
    /// the yes/no majority comparison. A tie (`votes_yes == votes_no`) resolves
    /// as Rejected even when quorum is met.
    ///
    /// # Errors
    /// - [`ContractError::ProposalNotFound`] if `proposal_id` does not exist.
    /// - [`ContractError::ProposalNotActive`] if the proposal is not in `Active` status.
    /// - [`ContractError::VotingStillOpen`] if the voting window has not yet closed.
    pub fn finalise(env: Env, proposal_id: u64) -> Result<(), ContractError> {
        if is_paused(&env) {
            return Err(ContractError::ContractPaused);
        }
        let mut proposal = load_proposal(&env, proposal_id)?;
        if proposal.state != ProposalState::Active {
            return Err(ContractError::ProposalNotActive);
        }
        let now = env.ledger().timestamp();
        if now <= proposal.end_time {
            return Err(ContractError::VotingStillOpen);
        }

        let total = proposal.votes_yes + proposal.votes_no + proposal.votes_abstain;
        if total >= proposal.quorum && proposal.votes_yes > proposal.votes_no {
            let timelock = get_timelock_duration(&env);
            proposal.execute_after = now + timelock;
            proposal.state = ProposalState::Passed;
        } else {
            proposal.state = ProposalState::Rejected;
        }

        save_proposal(&env, &proposal);
        events::proposal_finalised(&env, proposal_id, &proposal.state, proposal.execute_after);
        Ok(())
    }

    /// Marks a passed proposal as executed. Only the admin may call this.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if `admin` is the zero address.
    /// - [`ContractError::NotAdmin`] if `admin` does not match the stored admin.
    /// - [`ContractError::ProposalNotFound`] if `proposal_id` does not exist.
    /// - [`ContractError::ProposalNotPassed`] if the proposal has not passed.
    pub fn execute(env: Env, admin: Address, proposal_id: u64) -> Result<(), ContractError> {
        // SEC-005: auth first.
        admin.require_auth();
        // SEC-004: reject zero address.
        require_non_zero_address(&env, &admin)?;
        if is_paused(&env) {
            return Err(ContractError::ContractPaused);
        }
        if get_admin(&env)? != admin {
            return Err(ContractError::NotAdmin);
        }
        let mut proposal = load_proposal(&env, proposal_id)?;
        if proposal.state != ProposalState::Passed {
            return Err(ContractError::ProposalNotPassed);
        }
        if env.ledger().timestamp() < proposal.execute_after {
            return Err(ContractError::TimelockNotExpired);
        }
        proposal.state = ProposalState::Executed;
        save_proposal(&env, &proposal);
        events::proposal_executed(&env, proposal_id);
        Ok(())
    }

    /// Cancels an active proposal. Only the admin may cancel.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if `admin` is the zero address.
    /// - [`ContractError::NotAdmin`] if `admin` does not match the stored admin.
    /// - [`ContractError::ProposalNotFound`] if `proposal_id` does not exist.
    /// - [`ContractError::ProposalNotActive`] if the proposal is not in `Active` status.
    pub fn cancel(env: Env, admin: Address, proposal_id: u64) -> Result<(), ContractError> {
        // SEC-005: auth first.
        admin.require_auth();
        // SEC-004: reject zero address.
        require_non_zero_address(&env, &admin)?;
        if is_paused(&env) {
            return Err(ContractError::ContractPaused);
        }
        if get_admin(&env)? != admin {
            return Err(ContractError::NotAdmin);
        }
        let mut proposal = load_proposal(&env, proposal_id)?;
        if proposal.state != ProposalState::Active {
            return Err(ContractError::ProposalNotActive);
        }
        proposal.state = ProposalState::Cancelled;
        save_proposal(&env, &proposal);
        events::proposal_cancelled(&env, proposal_id);
        Ok(())
    }

    /// Updates the quorum threshold of an active proposal. Only the admin may call this.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if `admin` is the zero address.
    /// - [`ContractError::NotAdmin`] if `admin` does not match the stored admin.
    /// - [`ContractError::InvalidQuorum`] if `new_quorum` is zero or negative.
    /// - [`ContractError::ProposalNotFound`] if `proposal_id` does not exist.
    /// - [`ContractError::ProposalNotActive`] if the proposal is not in `Active` status.
    pub fn update_quorum(
        env: Env,
        admin: Address,
        proposal_id: u64,
        new_quorum: i128,
    ) -> Result<(), ContractError> {
        // SEC-005: auth first.
        admin.require_auth();
        // SEC-004: reject zero address.
        require_non_zero_address(&env, &admin)?;
        if is_paused(&env) {
            return Err(ContractError::ContractPaused);
        }
        if get_admin(&env)? != admin {
            return Err(ContractError::NotAdmin);
        }
        if new_quorum <= 0 {
            return Err(ContractError::InvalidQuorum);
        }
        let mut proposal = load_proposal(&env, proposal_id)?;
        if proposal.state != ProposalState::Active {
            return Err(ContractError::ProposalNotActive);
        }
        proposal.quorum = new_quorum;
        save_proposal(&env, &proposal);
        events::quorum_updated(&env, proposal_id, new_quorum);
        Ok(())
    }

    /// Transfers admin rights to a new address. Only the current admin may call this.
    ///
    /// The old admin loses all privileges immediately upon successful transfer.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if `admin` or `new_admin` is the zero address.
    /// - [`ContractError::NotAdmin`] if `admin` does not match the stored admin.
    pub fn transfer_admin(
        env: Env,
        admin: Address,
        new_admin: Address,
    ) -> Result<(), ContractError> {
        // SEC-005: auth first.
        admin.require_auth();
        // SEC-004: reject zero addresses for both parameters.
        require_non_zero_address(&env, &admin)?;
        require_non_zero_address(&env, &new_admin)?;
        if is_paused(&env) {
            return Err(ContractError::ContractPaused);
        }
        if get_admin(&env)? != admin {
            return Err(ContractError::NotAdmin);
        }
        set_admin(&env, &new_admin);
        events::admin_transferred(&env, &admin, &new_admin);
        Ok(())
    }

    /// SEC-006: Proposes a two-step admin key rotation.
    ///
    /// Nominates `new_admin` with an acceptance window of `window_secs` seconds
    /// (default 48 h when 0).  The admin key is NOT transferred until the nominee
    /// calls [`accept_admin_transfer`] within the window.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if either address is the zero address.
    /// - [`ContractError::NotAdmin`] if `admin` does not match the stored admin.
    /// - [`ContractError::ContractPaused`] if the contract is paused.
    pub fn propose_admin_transfer(
        env: Env,
        admin: Address,
        new_admin: Address,
        window_secs: u64,
    ) -> Result<(), ContractError> {
        admin.require_auth();
        require_non_zero_address(&env, &admin)?;
        require_non_zero_address(&env, &new_admin)?;
        if is_paused(&env) {
            return Err(ContractError::ContractPaused);
        }
        if get_admin(&env)? != admin {
            return Err(ContractError::NotAdmin);
        }
        let window = if window_secs == 0 {
            172_800
        } else {
            window_secs
        }; // default 48 h
        let expiry = env.ledger().timestamp() + window;
        set_pending_admin(&env, &new_admin);
        set_admin_transfer_expiry(&env, expiry);
        events::admin_transfer_proposed(&env, &admin, &new_admin, expiry);
        Ok(())
    }

    /// SEC-006: Accepts a pending admin key rotation.
    ///
    /// Must be called by the nominated address before the acceptance window expires.
    /// On success the caller becomes the new admin and the nomination is cleared.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if `new_admin` is the zero address.
    /// - [`ContractError::PendingAdminNotSet`] if no nomination is outstanding.
    /// - [`ContractError::NotPendingAdmin`] if `new_admin` is not the nominated address.
    /// - [`ContractError::AdminTransferExpired`] if the acceptance window has passed.
    /// - [`ContractError::ContractPaused`] if the contract is paused.
    pub fn accept_admin_transfer(env: Env, new_admin: Address) -> Result<(), ContractError> {
        new_admin.require_auth();
        require_non_zero_address(&env, &new_admin)?;
        if is_paused(&env) {
            return Err(ContractError::ContractPaused);
        }
        let pending = get_pending_admin(&env).ok_or(ContractError::PendingAdminNotSet)?;
        if pending != new_admin {
            return Err(ContractError::NotPendingAdmin);
        }
        if env.ledger().timestamp() > get_admin_transfer_expiry(&env) {
            clear_pending_admin(&env);
            return Err(ContractError::AdminTransferExpired);
        }
        let old_admin = get_admin(&env)?;
        set_admin(&env, &new_admin);
        clear_pending_admin(&env);
        events::admin_transferred(&env, &old_admin, &new_admin);
        Ok(())
    }

    /// Pauses the contract, blocking all state-changing operations.
    ///
    /// Read-only functions (`get_proposal`, `get_vote`, `has_voted`, etc.) remain
    /// available while paused. Only the admin may call this.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if `admin` is the zero address.
    /// - [`ContractError::NotAdmin`] if `admin` does not match the stored admin.
    pub fn pause(env: Env, admin: Address) -> Result<(), ContractError> {
        admin.require_auth();
        require_non_zero_address(&env, &admin)?;
        if get_admin(&env)? != admin {
            return Err(ContractError::NotAdmin);
        }
        set_paused(&env, true);
        events::contract_paused(&env, &admin);
        Ok(())
    }

    /// Unpauses the contract, restoring all state-changing operations.
    ///
    /// Only the admin may call this.
    ///
    /// # Errors
    /// - [`ContractError::InvalidAddress`] if `admin` is the zero address.
    /// - [`ContractError::NotAdmin`] if `admin` does not match the stored admin.
    /// - [`ContractError::NotPaused`] if the contract is not currently paused.
    pub fn unpause(env: Env, admin: Address) -> Result<(), ContractError> {
        admin.require_auth();
        require_non_zero_address(&env, &admin)?;
        if get_admin(&env)? != admin {
            return Err(ContractError::NotAdmin);
        }
        if !is_paused(&env) {
            return Err(ContractError::NotPaused);
        }
        set_paused(&env, false);
        events::contract_unpaused(&env, &admin);
        Ok(())
    }

    /// Returns whether the contract is currently paused.
    pub fn paused(env: Env) -> bool {
        is_paused(&env)
    }

    /// Returns the full state of a proposal.
    ///
    /// # Errors
    /// - [`ContractError::ProposalNotFound`] if `proposal_id` does not exist.
    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, ContractError> {
        load_proposal(&env, proposal_id)
    }

    /// Returns the total number of proposals ever created.
    pub fn proposal_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }

    /// Returns whether an address has already voted on a given proposal.
    pub fn has_voted(env: Env, proposal_id: u64, voter: Address) -> Result<bool, ContractError> {
        require_non_zero_address(&env, &voter)?;
        load_proposal(&env, proposal_id)?;
        Ok(has_voted(&env, proposal_id, &voter))
    }

    /// Returns the contract version as a `(major, minor, patch)` semver tuple.
    pub fn get_version(env: Env) -> (u32, u32, u32) {
        get_version(&env)
    }

    /// Returns the contract lifecycle state.
    pub fn get_state(env: Env) -> ContractState {
        get_contract_state(&env)
    }

    /// Lists proposals with offset/limit pagination.
    pub fn list_proposals(env: Env, offset: u64, limit: u64) -> soroban_sdk::Vec<Proposal> {
        const MAX_LIMIT: u64 = 50;

        let total = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);

        if offset >= total {
            return soroban_sdk::Vec::new(&env);
        }

        let effective_limit = if limit > MAX_LIMIT { MAX_LIMIT } else { limit };
        let start_id = offset + 1;
        let end_id = (offset + effective_limit).min(total);

        let mut proposals = soroban_sdk::Vec::new(&env);
        for id in start_id..=end_id {
            if let Ok(proposal) = load_proposal(&env, id) {
                proposals.push_back(proposal);
            }
        }

        proposals
    }

    // =========================================================================
    // Multi-sig admin (ADR-007)
    // =========================================================================
    //
    // The multi-sig path is an opt-in alternative to the single-admin path.
    // Use `initialize_multisig` instead of `initialize` to enable it.
    // All existing single-admin functions remain unchanged for backwards
    // compatibility with existing deployments.
    //
    // IMPLEMENTATION STATUS: scaffold / work-in-progress
    // The storage layer and types are complete.  The business logic below
    // (two-phase commit, expiry enforcement, action dispatch) is stubbed with
    // TODO markers for the full implementation tracked in issue #57.
    // =========================================================================

    /// Initialises the governance contract in multi-sig mode.
    ///
    /// Unlike `initialize`, this variant registers N co-signer addresses and an
    /// M-of-N threshold.  All N admins must authorise this call.
    ///
    /// # Parameters
    /// - `admins`    — Vec of co-signer addresses (1–10 members).
    /// - `threshold` — Number of co-signers required to approve any admin action.
    ///                 Must satisfy `1 <= threshold <= admins.len()`.
    ///
    /// # Errors
    /// - [`ContractError::AlreadyInitialized`] if the contract is already initialised.
    /// - [`ContractError::InvalidAdminSet`] if `admins` is empty or has more than 10 members.
    /// - [`ContractError::InvalidThreshold`] if `threshold` is 0 or > `admins.len()`.
    /// - [`ContractError::InvalidAddress`] if any address in `admins` is the zero address.
    pub fn initialize_multisig(
        env: Env,
        admins: Vec<Address>,
        threshold: u32,
        voting_token: Address,
        min_proposal_balance: i128,
        proposal_cooldown: u64,
        min_duration: u64,
        max_duration: u64,
        restrict_admin_vote: bool,
        timelock_duration: u64,
    ) -> Result<(), ContractError> {
        // All co-signers must authorise the initialisation call.
        for i in 0..admins.len() {
            admins.get(i).unwrap().require_auth();
        }

        if is_initialized(&env) {
            return Err(ContractError::AlreadyInitialized);
        }

        let n = admins.len();
        if n == 0 || n > 10 {
            return Err(ContractError::InvalidAdminSet);
        }
        if threshold == 0 || threshold > n {
            return Err(ContractError::InvalidThreshold);
        }

        for i in 0..n {
            require_non_zero_address(&env, &admins.get(i).unwrap())?;
        }
        require_non_zero_address(&env, &voting_token)?;

        // Store a sentinel admin (first co-signer) for compatibility with
        // single-admin storage reads. Multi-sig checks use MultisigAdmins.
        set_admin(&env, &admins.get(0).unwrap());
        set_multisig_admins(&env, &admins);
        set_multisig_threshold(&env, threshold);
        set_voting_token(&env, &voting_token);
        if min_proposal_balance > 0 {
            set_min_proposal_balance(&env, min_proposal_balance);
        }
        if proposal_cooldown > 0 {
            set_proposal_cooldown(&env, proposal_cooldown);
        }
        set_min_duration(&env, min_duration);
        set_max_duration(&env, max_duration);
        set_restrict_admin_vote(&env, restrict_admin_vote);
        if timelock_duration > 0 {
            set_timelock_duration(&env, timelock_duration);
        }
        set_version(&env, (1, 0, 0));
        set_contract_state(&env, &ContractState::Ready);

        // TODO(#57): emit multisig_initialized event with admin set and threshold.
        Ok(())
    }

    /// Proposes a multi-sig admin action.
    ///
    /// The caller must be a registered co-signer.  Their approval is
    /// automatically counted.  Returns the action ID that other co-signers
    /// use to cast their approvals.
    ///
    /// The pending action is stored in **temporary storage** with a 7-day expiry.
    ///
    /// # Errors
    /// - [`ContractError::NotMultisigAdmin`] if the caller is not a co-signer.
    /// - [`ContractError::MultisigRequired`] if the contract is not in multi-sig mode.
    pub fn propose_multisig_action(
        env: Env,
        proposer: Address,
        action: MultisigAction,
    ) -> Result<u64, ContractError> {
        proposer.require_auth();

        if !is_multisig(&env) {
            return Err(ContractError::MultisigRequired);
        }

        // Verify proposer is in the admin set.
        let admins = get_multisig_admins(&env).ok_or(ContractError::NotMultisigAdmin)?;
        if !admins.contains(&proposer) {
            return Err(ContractError::NotMultisigAdmin);
        }

        let action_id = next_action_id(&env)?;
        let mut approvals = Vec::new(&env);
        approvals.push_back(proposer.clone());

        // TODO(#57): derive expiry from configurable TTL (default 7 days).
        let expires_at = env.ledger().timestamp() + 604_800;

        save_pending_action(
            &env,
            action_id,
            &PendingMultisigAction {
                action,
                approvals,
                expires_at,
            },
        );

        // TODO(#57): emit action_proposed event.
        Ok(action_id)
    }

    /// Approves a pending multi-sig action.
    ///
    /// Once the number of distinct approvals reaches the configured threshold,
    /// any co-signer may call `execute_multisig_action` to dispatch the action.
    ///
    /// # Errors
    /// - [`ContractError::NotMultisigAdmin`] if the caller is not a co-signer.
    /// - [`ContractError::PendingActionNotFound`] if the action does not exist or has expired.
    /// - [`ContractError::AlreadyApproved`] if the caller has already approved.
    pub fn approve_multisig_action(
        env: Env,
        approver: Address,
        action_id: u64,
    ) -> Result<(), ContractError> {
        approver.require_auth();

        if !is_multisig(&env) {
            return Err(ContractError::MultisigRequired);
        }

        let admins = get_multisig_admins(&env).ok_or(ContractError::NotMultisigAdmin)?;
        if !admins.contains(&approver) {
            return Err(ContractError::NotMultisigAdmin);
        }

        let mut pending =
            get_pending_action(&env, action_id).ok_or(ContractError::PendingActionNotFound)?;

        // Check expiry.
        if env.ledger().timestamp() > pending.expires_at {
            remove_pending_action(&env, action_id);
            return Err(ContractError::PendingActionNotFound);
        }

        if pending.approvals.contains(&approver) {
            return Err(ContractError::AlreadyApproved);
        }

        pending.approvals.push_back(approver.clone());
        save_pending_action(&env, action_id, &pending);

        // TODO(#57): emit action_approved event.
        Ok(())
    }

    /// Executes a pending multi-sig action once the approval threshold is met.
    ///
    /// Any co-signer may call this once the action has enough approvals.
    ///
    /// # Errors
    /// - [`ContractError::NotMultisigAdmin`] if the caller is not a co-signer.
    /// - [`ContractError::PendingActionNotFound`] if the action does not exist or has expired.
    /// - [`ContractError::InsufficientApprovals`] if the threshold has not been reached.
    pub fn execute_multisig_action(
        env: Env,
        executor: Address,
        action_id: u64,
    ) -> Result<(), ContractError> {
        executor.require_auth();

        if !is_multisig(&env) {
            return Err(ContractError::MultisigRequired);
        }

        let admins = get_multisig_admins(&env).ok_or(ContractError::NotMultisigAdmin)?;
        if !admins.contains(&executor) {
            return Err(ContractError::NotMultisigAdmin);
        }

        let pending =
            get_pending_action(&env, action_id).ok_or(ContractError::PendingActionNotFound)?;

        if env.ledger().timestamp() > pending.expires_at {
            remove_pending_action(&env, action_id);
            return Err(ContractError::PendingActionNotFound);
        }

        let threshold = get_multisig_threshold(&env);
        if pending.approvals.len() < threshold {
            return Err(ContractError::InsufficientApprovals);
        }

        // Dispatch the approved action.
        // TODO(#57): implement the full dispatch for all MultisigAction variants.
        match pending.action {
            MultisigAction::AdminExecute(_proposal_id) => {
                // TODO(#57): call the execute logic (currently requires single admin).
                // This will be wired to a shared internal helper extracted from `execute`.
            }
            MultisigAction::AdminCancel(_proposal_id) => {
                // TODO(#57): call the cancel logic.
            }
            MultisigAction::AdminPause => {
                set_paused(&env, true);
            }
            MultisigAction::AdminUnpause => {
                set_paused(&env, false);
            }
            MultisigAction::AdminUpdateQuorum(_proposal_id, _new_quorum) => {
                // TODO(#57): update quorum on the proposal.
            }
            MultisigAction::AdminTransfer(new_admins) => {
                set_multisig_admins(&env, &new_admins);
                set_admin(&env, &new_admins.get(0).unwrap());
                // TODO(#57): emit admin_transfer event.
            }
        }

        remove_pending_action(&env, action_id);
        // TODO(#57): emit action_executed event.
        Ok(())
    }

    /// Returns whether the contract is operating in multi-sig mode.
    pub fn is_multisig_mode(env: Env) -> bool {
        is_multisig(&env)
    }

    /// Returns the multi-sig co-signer addresses, or an empty Vec if not in multi-sig mode.
    pub fn get_multisig_admins(env: Env) -> Vec<Address> {
        storage::get_multisig_admins(&env).unwrap_or_else(|| Vec::new(&env))
    }

    /// Returns the multi-sig approval threshold.
    pub fn get_multisig_threshold(env: Env) -> u32 {
        storage::get_multisig_threshold(&env)
    }
}
