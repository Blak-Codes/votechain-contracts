import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy-load page components for code splitting
const ProposalList   = React.lazy(() => import("./pages/ProposalList"));
const ProposalDetail = React.lazy(() => import("./pages/ProposalDetail"));
const VotingPanel    = React.lazy(() => import("./pages/VotingPanel"));

/** Shown for any unknown route. */
function NotFound() {
  return (
    <main style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <h1>404 — Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/">← Back to Proposals</a>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary section="App">
        <React.Suspense fallback={<p aria-live="polite">Loading…</p>}>
          <Routes>
            {/* Redirect root to proposals list */}
            <Route path="/" element={<Navigate to="/proposals" replace />} />

            {/* Proposal list */}
            <Route
              path="/proposals"
              element={
                <ErrorBoundary section="ProposalList">
                  <ProposalList />
                </ErrorBoundary>
              }
            />

            {/* Single proposal detail — deep-linkable by ID */}
            <Route
              path="/proposals/:id"
              element={
                <ErrorBoundary section="ProposalDetail">
                  <ProposalDetail />
                </ErrorBoundary>
              }
            />

            {/* Voting panel */}
            <Route
              path="/vote"
              element={
                <ErrorBoundary section="VotingPanel">
                  <VotingPanel />
                </ErrorBoundary>
              }
            />

            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
