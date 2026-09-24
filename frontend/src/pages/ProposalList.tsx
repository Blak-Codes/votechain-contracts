/**
 * ProposalList page — consumes ProposalContext (issue #10).
 * No prop-drilling: proposals are read directly from context.
 */
import React from 'react';
import ProposalListComponent from '../components/ProposalList';
import { useProposals } from '../context/ProposalContext';

export default function ProposalList() {
  const { proposals, loading, error } = useProposals();

  if (loading) return <p aria-live="polite">Loading proposals…</p>;
  if (error) return <p role="alert">Error: {error}</p>;

  return <ProposalListComponent proposals={proposals} />;
}
