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

The React entry point runs `@axe-core/react` only in development mode. CI builds
the production preview and runs `npm run audit:a11y`; the axe command fails the
job when it finds WCAG violations. Keep text and badge foreground/background
pairs at a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large
text or UI components in both light and dark themes.
