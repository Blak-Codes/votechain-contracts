import React from "react";
import { useTranslation } from "react-i18next";
import { TxState } from "../hooks/useTransactionStatus";

type Props = {
  tx: TxState;
  onRetry?: () => void;
  onDismiss?: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "transaction.pending",
  confirmed: "transaction.confirmed",
  failed: "transaction.failed",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#b8860b",
  confirmed: "#2e7d32",
  failed: "#c62828",
};

export function TransactionToast({ tx, onRetry, onDismiss }: Props) {
  const { t } = useTranslation();

  if (tx.status === "idle" || !tx.hash) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "#1e1e1e",
        color: "#fff",
        borderLeft: `4px solid ${STATUS_COLOR[tx.status] ?? "#888"}`,
        borderRadius: 6,
        padding: "12px 16px",
        minWidth: 300,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        zIndex: 9999,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {t(STATUS_LABEL[tx.status])}
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>
        {tx.hash}
      </div>

      {tx.explorerUrl && (
        <a
          href={tx.explorerUrl}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, color: "#90caf9", display: "block", marginTop: 4 }}
        >
          {t("transaction.viewExplorer")} ↗
        </a>
      )}

      {tx.error && (
        <div style={{ color: "#ef9a9a", fontSize: 12, marginTop: 4 }}>
          {tx.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {tx.status === "failed" && onRetry && (
          <button
            onClick={onRetry}
            style={{ fontSize: 12, padding: "2px 8px", cursor: "pointer" }}
            aria-label={t("transaction.retry")}
          >
            {t("transaction.retryButton")}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{ fontSize: 12, padding: "2px 8px", cursor: "pointer" }}
            aria-label={t("transaction.dismiss")}
          >
            {t("transaction.dismissButton")}
          </button>
        )}
      </div>
    </div>
  );
}
