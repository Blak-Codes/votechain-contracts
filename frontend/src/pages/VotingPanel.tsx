/**
 * VotingPanel page — consumes WalletContext and ProposalContext (issue #10).
 * Wallet address is available without prop-drilling.
 */
import React from 'react';
import { useWallet } from '../context/WalletContext';
import { useProposals } from '../context/ProposalContext';

export default function VotingPanel() {
  const { address, connected, connect } = useWallet();
  const { proposals, loading } = useProposals();

  if (!connected) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Connect your wallet to participate in governance voting.</p>
        <button onClick={connect} style={{ marginTop: '1rem' }}>
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) return <p aria-live="polite">Loading proposals…</p>;

  const activeProposals = proposals.filter((p) => p.state === 'Active');

  return (
    <section aria-labelledby="voting-panel-heading" style={{ padding: '1.5rem' }}>
      <h2 id="voting-panel-heading">Voting Panel</h2>
      <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        Connected as: <code>{address}</code>
      </p>
      {activeProposals.length === 0 ? (
        <p>No active proposals to vote on.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activeProposals.map((proposal) => (
            <li
              key={proposal.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <strong>{proposal.title}</strong>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--color-text-muted)' }}>
                {proposal.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
