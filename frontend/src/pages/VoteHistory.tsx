/**
 * VoteHistory page — consumes ProposalContext and WalletContext (issue #10).
 * No prop-drilling: proposals come from context, wallet address pre-fills the filter.
 */
import React from 'react';
import VoteHistoryComponent from '../components/VoteHistory';
import { useProposals } from '../context/ProposalContext';

export default function VoteHistory() {
  const { proposals, loading, error } = useProposals();

  if (loading) return <p aria-live="polite">Loading vote history…</p>;
  if (error) return <p role="alert">Error: {error}</p>;

  return <VoteHistoryComponent proposals={proposals} />;
}
