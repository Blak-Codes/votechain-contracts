export type ProposalState = 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Cancelled';

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
