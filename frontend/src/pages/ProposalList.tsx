/**
 * ProposalList page — shows ProposalListSkeleton while loading (issue #13).
 */
import React, { useEffect, useState } from 'react';
import type { Proposal } from '../types';
import { sampleProposals } from '../data';
import ProposalListComponent from '../components/ProposalList';
import { ProposalListSkeleton } from '../components/Skeleton';

async function fetchProposals(): Promise<Proposal[]> {
  // TODO: replace with real API call
  return new Promise((resolve) => setTimeout(() => resolve(sampleProposals), 600));
}

export default function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals()
      .then(setProposals)
      .catch((e: unknown) =>
        setError((e as { message?: string })?.message ?? 'Failed to load proposals.')
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ProposalListSkeleton />;
  if (error) return <p role="alert">Error: {error}</p>;

  return <ProposalListComponent proposals={proposals} />;
}
