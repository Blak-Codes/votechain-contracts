# VoteChain Frontend — Proposals Page

A lightweight React + Vite frontend for browsing governance proposals: state badges, vote
summaries, countdown timers for active proposals, wallet connection, and vote history.

## Structure

```
frontend/
├── index.html             # Main HTML entry point
├── src/
│   ├── App.tsx            # Root component; renders TransactionToast at app root
│   ├── main.tsx           # ReactDOM entry
│   ├── proposals.ts       # Proposal rendering, filtering, pagination, countdown logic
│   ├── types.ts           # Shared TypeScript types (Proposal, RawProposal, etc.)
│   ├── data.ts            # Static data helpers
│   ├── index.css          # Base styles
│   ├── styles.css         # All styles (WCAG 2.1 AA compliant)
│   ├── components/
│   │   ├── ErrorBoundary.tsx      # Error boundary with fallback card and Report issue link
│   │   ├── TransactionToast.tsx   # Transaction status toast (pending/confirmed/failed)
│   │   ├── FreighterWallet.tsx    # Freighter wallet connector
│   │   ├── ProposalList.tsx       # Proposal list component
│   │   └── VoteHistory.tsx        # Wallet vote history view
│   ├── hooks/
│   │   └── useTransactionStatus.ts  # Hook for polling Horizon transaction status
│   ├── pages/
│   │   ├── GovernanceDashboard.tsx
│   │   ├── ProposalDetail.tsx
│   │   ├── ProposalList.tsx
│   │   └── VotingPanel.tsx
│   └── utils/
│       └── csv.ts
└── scripts/
    └── bundle-size.js     # Bundle size checker (enforces 250 KB gzip limit)
```

## Running locally

```bash
cd frontend
npm install
npm run dev
```

Or build for production:

```bash
npm run build
npm run preview
```

## Connecting to a live contract

In `src/proposals.ts`, replace the `MOCK_PROPOSALS` array with a real fetch from your
Stellar RPC endpoint. The expected shape of each proposal object matches the on-chain
`Proposal` struct (see `src/types.ts` → `RawProposal`):

```ts
{
  id:            number,   // u64 from contract
  title:         string,
  proposer:      string,   // Stellar address (G...)
  votes_yes:     number,
  votes_no:      number,
  votes_abstain: number,
  quorum:        number,
  start_time:    number,   // Unix timestamp (seconds)
  end_time:      number,   // Unix timestamp (seconds)
  state:         'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Cancelled',
  execute_after: number,   // Unix timestamp; 0 if not applicable
}
```

## Accessibility

- WCAG 2.1 AA compliant
- All colour combinations meet ≥ 4.5:1 contrast ratio
- Skip-to-content link for keyboard users
- `aria-live` regions for dynamic content updates
- `aria-pressed` on filter toggle buttons
- `aria-label` on all interactive and informational elements
- Fully keyboard navigable
- Respects `prefers-reduced-motion`
- `ErrorBoundary` moves focus to the error region when an error is caught

## Bundle Size Budget

The frontend enforces bundle size limits in CI to prevent silent growth.

| Metric | Limit | Enforcement |
|--------|-------|-------------|
| Main JS bundle (gzipped) | **250 KB** | CI fails if exceeded |
| Bundle size change vs base | **> 5%** | PR comment posted automatically |

### Checking locally

```bash
npm run build
npm run size
```

The script (`scripts/bundle-size.js`) reads `dist/assets/*.js`, computes gzip sizes,
and exits with a non-zero code if the main bundle exceeds 250 KB gzipped.

A machine-readable report is written to `dist/bundle-report.json` after each run.

### Overriding the limit

Set `BUNDLE_SIZE_LIMIT_KB` to temporarily adjust the threshold (useful for profiling):

```bash
BUNDLE_SIZE_LIMIT_KB=300 npm run size
```

> **Note:** Do not raise the limit permanently without a conscious architectural decision.
> Keep dependencies lean; prefer tree-shaking-friendly libraries.
