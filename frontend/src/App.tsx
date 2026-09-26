import React from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useTranslation } from "react-i18next";

// Placeholder page components — replace with real implementations
const ProposalList = React.lazy(() => import("./pages/ProposalList"));
const ProposalDetail = React.lazy(() => import("./pages/ProposalDetail"));
const VotingPanel = React.lazy(() => import("./pages/VotingPanel"));

export default function App() {
  const { t } = useTranslation();

  return (
    <ErrorBoundary section="App">
      {/* TransactionToast is rendered outside routing so it persists across navigation */}
      <TransactionToast
        tx={tx}
        onRetry={tx.hash ? () => retry(tx.hash!) : undefined}
        onDismiss={reset}
      />

      <ErrorBoundary section="ProposalList">
        <React.Suspense fallback={<p>{t("app.loading")}</p>}>
          <ProposalList />
        </React.Suspense>
      </ErrorBoundary>

      <ErrorBoundary section="ProposalDetail">
        <React.Suspense fallback={<p>{t("app.loading")}</p>}>
          <ProposalDetail />
        </React.Suspense>
      </ErrorBoundary>

      <ErrorBoundary section="VotingPanel">
        <React.Suspense fallback={<p>{t("app.loading")}</p>}>
          <VotingPanel />
        </React.Suspense>
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
