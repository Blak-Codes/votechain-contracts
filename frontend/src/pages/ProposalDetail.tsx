import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Proposal, ProposalState } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProposalDetailData extends Proposal {
  proposer: string;
  quorum: number;
  startAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<ProposalState, string> = {
  Active:    "Active",
  Passed:    "Passed",
  Rejected:  "Rejected",
  Executed:  "Executed",
  Cancelled: "Cancelled",
};

function StateBadge({ state }: { state: ProposalState }) {
  return (
    <span
      className={`status-chip status-${state.toLowerCase()}`}
      role="status"
      aria-label={`Proposal status: ${STATE_LABELS[state]}`}
    >
      {STATE_LABELS[state]}
    </span>
  );
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Format a date string or ISO timestamp for display. */
function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/** Countdown to end time (updates every second for Active proposals). */
function useCountdown(endAt: string, state: ProposalState): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (state !== "Active") {
      setLabel("");
      return;
    }

    function computeLabel() {
      const remaining = Math.max(0, new Date(endAt).getTime() - Date.now());
      if (remaining === 0) return "Ended";
      const totalSecs = Math.floor(remaining / 1000);
      const d = Math.floor(totalSecs / 86400);
      const h = Math.floor((totalSecs % 86400) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      if (d > 0) return `${d}d ${h}h remaining`;
      if (h > 0) return `${h}h ${m}m remaining`;
      if (m > 0) return `${m}m ${s}s remaining`;
      return `${s}s remaining`;
    }

    setLabel(computeLabel());
    const timer = setInterval(() => setLabel(computeLabel()), 1000);
    return () => clearInterval(timer);
  }, [endAt, state]);

  return label;
}

// ── Vote bar ──────────────────────────────────────────────────────────────────

function VoteBar({ proposal }: { proposal: ProposalDetailData }) {
  const total = proposal.totalWeight;
  const yesWeight  = proposal.votes.filter(v => v.type === "For").reduce((s, v) => s + v.weight, 0);
  const noWeight   = proposal.votes.filter(v => v.type === "Against").reduce((s, v) => s + v.weight, 0);
  const absWeight  = proposal.votes.filter(v => v.type === "Abstain").reduce((s, v) => s + v.weight, 0);

  const yesPct  = total > 0 ? ((yesWeight  / total) * 100).toFixed(1) : "0";
  const noPct   = total > 0 ? ((noWeight   / total) * 100).toFixed(1) : "0";
  const absPct  = total > 0 ? ((absWeight  / total) * 100).toFixed(1) : "0";

  return (
    <div aria-label={`Vote breakdown: Yes ${yesPct}%, No ${noPct}%, Abstain ${absPct}%`}>
      {/* Stacked bar */}
      <div
        role="img"
        aria-hidden="true"
        style={{
          display: "flex",
          height: "16px",
          borderRadius: "4px",
          overflow: "hidden",
          background: "#e5e7eb",
          margin: "0.5rem 0",
        }}
      >
        <div style={{ width: `${yesPct}%`,  background: "#22c55e" }} />
        <div style={{ width: `${noPct}%`,   background: "#ef4444" }} />
        <div style={{ width: `${absPct}%`,  background: "#94a3b8" }} />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem" }}>
        <span><strong style={{ color: "#22c55e" }}>Yes</strong> {yesWeight.toLocaleString()} ({yesPct}%)</span>
        <span><strong style={{ color: "#ef4444" }}>No</strong> {noWeight.toLocaleString()} ({noPct}%)</span>
        <span><strong style={{ color: "#94a3b8" }}>Abstain</strong> {absWeight.toLocaleString()} ({absPct}%)</span>
      </div>
    </div>
  );
}

// ── Quorum progress ───────────────────────────────────────────────────────────

function QuorumProgress({ current, required }: { current: number; required: number }) {
  const pct = required > 0 ? Math.min(100, (current / required) * 100) : 0;
  const met = current >= required;

  return (
    <div aria-label={`Quorum: ${current.toLocaleString()} of ${required.toLocaleString()} required${met ? ", met" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
        <span>Quorum {met ? "✓ Met" : "Not yet met"}</span>
        <span>{current.toLocaleString()} / {required.toLocaleString()}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Quorum progress: ${Math.round(pct)}%`}
        style={{
          height: "8px",
          borderRadius: "4px",
          background: "#e5e7eb",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: met ? "#22c55e" : "#3b82f6", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// ── Vote history table ────────────────────────────────────────────────────────

function VoteHistoryTable({ proposal }: { proposal: ProposalDetailData }) {
  if (proposal.votes.length === 0) {
    return <p>No votes cast yet.</p>;
  }

  return (
    <div className="table-wrapper">
      <table aria-label="Vote history">
        <thead>
          <tr>
            <th scope="col">Address</th>
            <th scope="col">Choice</th>
            <th scope="col">Weight</th>
            <th scope="col">Voted at</th>
          </tr>
        </thead>
        <tbody>
          {proposal.votes.map((v, i) => (
            <tr key={i}>
              <td>
                <span title={v.address}>{truncateAddress(v.address)}</span>
              </td>
              <td>
                <span
                  style={{
                    color: v.type === "For" ? "#22c55e" : v.type === "Against" ? "#ef4444" : "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  {v.type}
                </span>
              </td>
              <td>{v.weight.toLocaleString()}</td>
              <td>{formatDate(v.votedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Admin controls ────────────────────────────────────────────────────────────

/** Shown only to the admin address — real auth integration is a separate task. */
function AdminControls({ proposal, isAdmin }: { proposal: ProposalDetailData; isAdmin: boolean }) {
  if (!isAdmin) return null;

  const canExecute = proposal.state === "Passed";
  const canCancel  = proposal.state === "Active";

  if (!canExecute && !canCancel) return null;

  return (
    <section aria-labelledby="admin-controls-heading" style={{ marginTop: "1.5rem" }}>
      <h2 id="admin-controls-heading" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Admin Controls
      </h2>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {canExecute && (
          <button
            type="button"
            onClick={() => alert(`Execute proposal ${proposal.id} — wire up to contract call`)}
            style={{ background: "#22c55e", color: "#fff", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", cursor: "pointer" }}
          >
            Execute
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => alert(`Cancel proposal ${proposal.id} — wire up to contract call`)}
            style={{ background: "#ef4444", color: "#fff", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", cursor: "pointer" }}
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Route: /proposals/:id
 *
 * Full proposal detail view showing metadata, vote breakdown, quorum progress,
 * timeline, vote history table, countdown timer, and admin controls.
 *
 * Fetches proposal data from GET /api/proposals/:id.
 * Falls back to 404 state if the proposal is not found.
 *
 * Accessibility:
 *  - Heading hierarchy: h1 (proposal title) → h2 (sections)
 *  - Live region announces state changes
 *  - All interactive elements are keyboard-accessible
 */
export default function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [proposal, setProposal]   = useState<ProposalDetailData | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<string | null>(null);
  const [notFound, setNotFound]   = useState(false);

  // Simulated admin detection — replace with real wallet/auth context
  const isAdmin = false;

  const countdown = useCountdown(proposal?.endAt ?? "", proposal?.state ?? "Cancelled");

  const loadProposal = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data: ProposalDetailData = await res.json();
      setProposal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proposal.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main aria-busy="true" aria-label="Loading proposal" style={{ padding: "2rem" }}>
        <p aria-live="polite">Loading proposal…</p>
      </main>
    );
  }

  // ── 404 state ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <main style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <h1>Proposal Not Found</h1>
        <p>No proposal with ID <strong>{id}</strong> exists on-chain.</p>
        <Link to="/proposals">← Back to proposals</Link>
      </main>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <main role="alert" style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>{error}</p>
        <button
          type="button"
          onClick={loadProposal}
          style={{ marginTop: "1rem", padding: "0.5rem 1.25rem", cursor: "pointer" }}
        >
          Retry
        </button>
        <br />
        <Link to="/proposals" style={{ display: "inline-block", marginTop: "1rem" }}>
          ← Back to proposals
        </Link>
      </main>
    );
  }

  if (!proposal) return null;

  // ── Full detail view ───────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Back link */}
      <Link to="/proposals" aria-label="Back to proposal list" style={{ fontSize: "0.875rem" }}>
        ← All Proposals
      </Link>

      {/* Live region announces state changes to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="visually-hidden" id="proposal-state-live">
        {`Proposal status: ${proposal.state}`}
      </div>

      {/* Header */}
      <header style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>#{proposal.id}</span>
          <StateBadge state={proposal.state} />
          {countdown && (
            <span
              aria-live="off"
              style={{ fontSize: "0.875rem", color: "#6b7280" }}
            >
              ⏱ {countdown}
            </span>
          )}
        </div>
        <h1 style={{ marginTop: "0.5rem", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.3 }}>
          {proposal.title}
        </h1>
      </header>

      {/* Metadata */}
      <section aria-labelledby="meta-heading" style={{ marginTop: "1.5rem" }}>
        <h2 id="meta-heading" className="visually-hidden">Proposal metadata</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.35rem 1.25rem", fontSize: "0.875rem" }}>
          <dt style={{ color: "#6b7280" }}>Proposer</dt>
          <dd>
            <span title={proposal.proposer}>{truncateAddress(proposal.proposer)}</span>
          </dd>
          <dt style={{ color: "#6b7280" }}>Created</dt>
          <dd>{formatDate(proposal.createdAt)}</dd>
          <dt style={{ color: "#6b7280" }}>Voting ends</dt>
          <dd>{formatDate(proposal.endAt)}</dd>
        </dl>
      </section>

      {/* Description */}
      <section aria-labelledby="desc-heading" style={{ marginTop: "1.5rem" }}>
        <h2 id="desc-heading" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Description
        </h2>
        <p style={{ lineHeight: 1.7 }}>{proposal.description}</p>
      </section>

      {/* Vote breakdown */}
      <section aria-labelledby="votes-heading" style={{ marginTop: "1.5rem" }}>
        <h2 id="votes-heading" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Vote Breakdown
        </h2>
        <VoteBar proposal={proposal} />
      </section>

      {/* Quorum progress */}
      <section aria-labelledby="quorum-heading" style={{ marginTop: "1.5rem" }}>
        <h2 id="quorum-heading" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Quorum
        </h2>
        <QuorumProgress current={proposal.totalWeight} required={proposal.quorum} />
      </section>

      {/* Vote history */}
      <section aria-labelledby="history-heading" style={{ marginTop: "1.5rem" }}>
        <h2 id="history-heading" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Vote History ({proposal.votesCount} vote{proposal.votesCount !== 1 ? "s" : ""})
        </h2>
        <VoteHistoryTable proposal={proposal} />
      </section>

      {/* Admin controls */}
      <AdminControls proposal={proposal} isAdmin={isAdmin} />
    </main>
  );
}
