import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * Page components — all consume WalletContext / ProposalContext from
 * providers in main.tsx (issue #10 — no prop-drilling).
 */
const ProposalList = React.lazy(() => import('./pages/ProposalList'));
const ProposalDetail = React.lazy(() => import('./pages/ProposalDetail'));
const VotingPanel = React.lazy(() => import('./pages/VotingPanel'));
const VoteHistory = React.lazy(() => import('./pages/VoteHistory'));

export default function App() {
  return (
    <ErrorBoundary section="App">
      <ErrorBoundary section="ProposalList">
        <React.Suspense fallback={<p>Loading…</p>}>
          <ProposalList />
        </React.Suspense>
      </ErrorBoundary>

      <ErrorBoundary section="ProposalDetail">
        <React.Suspense fallback={<p>Loading…</p>}>
          <ProposalDetail />
        </React.Suspense>
      </ErrorBoundary>

      <ErrorBoundary section="VotingPanel">
        <React.Suspense fallback={<p>Loading…</p>}>
          <VotingPanel />
        </React.Suspense>
      </ErrorBoundary>

      <ErrorBoundary section="VoteHistory">
        <React.Suspense fallback={<p>Loading…</p>}>
          <VoteHistory />
        </React.Suspense>
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
