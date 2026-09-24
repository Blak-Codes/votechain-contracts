/**
 * ProposalDetail page — shows ProposalDetailSkeleton while loading (issue #13).
 * Replace the placeholder with real proposal data once routing (#8) is wired up.
 */
import React, { useEffect, useState } from 'react';
import type { Proposal } from '../types';
import { sampleProposals } from '../data';
import { ProposalDetailSkeleton } from '../components/Skeleton';

async function fetchProposal(id: string): Promise<Proposal | undefined> {
  // TODO: replace with fetch(`/api/proposals/${id}`)
  return new Promise((resolve) =>
    setTimeout(() => resolve(sampleProposals.find((p) => p.id === id)), 600)
  );
}

export default function ProposalDetail() {
  // Placeholder: uses the first sample proposal until routing is implemented
  const id = sampleProposals[0]?.id ?? '';

  const [proposal, setProposal] = useState<Proposal | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProposal(id)
      .then(setProposal)
      .catch((e: unknown) =>
        setError((e as { message?: string })?.message ?? 'Failed to load proposal.')
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ProposalDetailSkeleton />;
  if (error) return <p role="alert">Error: {error}</p>;
  if (!proposal) return <p>Proposal not found.</p>;

  return (
    <article style={{ padding: '2rem 0' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        ← Back to proposals
      </p>
      <h1 style={{ marginBottom: '0.5rem' }}>{proposal.title}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        {proposal.description}
      </p>
      <p style={{ fontSize: '0.875rem' }}>
        State: <strong>{proposal.state}</strong> · Votes: {proposal.votesCount}
      </p>
    </article>
  );
}
