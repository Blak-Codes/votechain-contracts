# Contract Error Reference

All `ContractError` codes returned by VoteChain smart contracts as `u32` values.

---

## Governance Contract

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 1 | `AdminNotSet` | Contract has not been initialized — no admin address is stored. | Call `initialize(admin, voting_token)` before invoking any other function. |
| 2 | `NotAdmin` | Caller is not the configured admin address. | Sign the transaction with the admin keypair set during `initialize`. |
| 3 | `VotingTokenNotSet` | The governance token address was not set during initialization. | Re-initialize the contract with a valid `voting_token` address. |
| 4 | `InvalidQuorum` | `quorum` passed to `create_proposal` is zero or negative. | Provide a quorum value greater than zero (denominated in token units). |
| 5 | `InvalidDuration` | `duration` passed to `create_proposal` is zero. | Provide a duration of at least 1 ledger. |
| 6 | `ProposalNotFound` | No proposal exists for the given `proposal_id`. | Verify the ID with `proposal_count()` — valid IDs are in the range `[1, proposal_count]`. |
| 7 | `ProposalNotActive` | The proposal is not in `Active` status (e.g. already Passed, Rejected, Executed, or Cancelled). | Check the proposal status with `get_proposal(proposal_id)` before calling the function. |
| 8 | `VotingPeriodEnded` | The current ledger timestamp is past the proposal's `end_time`. | The voting window has closed; call `finalise(proposal_id)` to settle the result. |
| 9 | `VotingStillOpen` | `finalise` was called before the voting period has ended. | Wait until the ledger timestamp exceeds the proposal's `end_time`, then retry. |
| 10 | `AlreadyVoted` | The voter address has already cast a vote on this proposal. | Each address may vote exactly once. Use `has_voted(proposal_id, voter)` to check before calling `cast_vote`. |
| 11 | `NoVotingPower` | The voter holds zero governance tokens at the time of voting. | Acquire a non-zero balance of the governance token before casting a vote. |
| 12 | `ProposalNotPassed` | `execute` was called on a proposal that did not reach `Passed` status. | Confirm the proposal status is `Passed` with `get_proposal(proposal_id)` before calling `execute`. |

---

## Token Contract

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 1 | `AdminNotSet` | Token contract has not been initialized — no admin address is stored. | Initialize the token contract with an admin address before minting or configuring it. |
| 2 | `NotAdmin` | Caller is not the token contract admin. | Sign the transaction with the admin keypair used during token initialization. |
| 3 | `InvalidAmount` | The amount provided to `transfer`, `mint`, or `burn` is zero or negative. | Provide a positive integer amount. |
| 4 | `InsufficientBalance` | The sender's token balance is less than the requested transfer or burn amount. | Check the sender's balance before initiating the operation and ensure sufficient funds. |
| 5 | `AllowanceExceeded` | The spender's approved allowance is less than the requested `transfer_from` amount. | Call `approve` to increase the allowance before calling `transfer_from`. |

---

## Notes

- Error codes are scoped per contract — code `1` in the governance contract and code `1` in the token contract are independent.
- Errors are returned as `Result::Err(ContractError)` and surface as a `u32` in Soroban host diagnostics.
- Use `get_proposal(proposal_id)` and `has_voted(proposal_id, voter)` as pre-flight checks to avoid the most common errors.

---

## Backend API Errors

The Node.js backend returns structured JSON error responses for invalid requests.

### VALIDATION_ERROR

**HTTP status:** `400 Bad Request`

**When returned:** The request body fails schema validation (missing required fields, values out of range, wrong types, etc.).

**Response shape:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": [
      { "field": "title",    "message": "title must be at least 1 character" },
      { "field": "duration", "message": "duration must be at least 60 seconds" }
    ]
  }
}
```

**Field-level constraints validated:**

| Endpoint | Field | Constraint |
|----------|-------|------------|
| `POST /proposals` | `title` | 1–128 characters |
| `POST /proposals` | `description` | 1–1 024 characters |
| `POST /proposals` | `quorum` | Positive integer |
| `POST /proposals` | `duration` | 60–2 592 000 seconds |
| `POST /proposals/:id/vote` | `proposal_id` | Positive integer |
| `POST /proposals/:id/vote` | `vote` | One of `"Yes"`, `"No"`, `"Abstain"` |
| `POST /proposals/:id/vote` | `voter` | 56-character Stellar address starting with `G` |

**Resolution:** Correct the identified fields and retry the request.
