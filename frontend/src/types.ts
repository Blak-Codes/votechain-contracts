export type ProposalState = 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Cancelled';

/**
 * Raw on-chain proposal struct as returned by the Stellar governance contract.
 * Used by the proposals page renderer (proposals.ts).
 */
export interface RawProposal {
  /** Numeric proposal ID from the contract */
  id: number;
  title: string;
  proposer: string;
  votes_yes: number;
  votes_no: number;
  votes_abstain: number;
  quorum: number;
  /** Unix timestamp (seconds) */
  start_time: number;
  /** Unix timestamp (seconds) */
  end_time: number;
  state: ProposalState;
  /** Unix timestamp (seconds); 0 if not applicable */
  execute_after: number;
}

export interface VoteRecord {
  address: string;
  type: 'For' | 'Against' | 'Abstain';
  weight: number;
  votedAt: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  /** Address of the account that created the proposal. */
  proposer: string;
  state: ProposalState;
  createdAt: string;
  endAt: string;
  /** Minimum total vote weight required for the proposal to be finalisable. */
  quorum: number;
  votesCount: number;
  totalWeight: number;
  votes: VoteRecord[];
}
