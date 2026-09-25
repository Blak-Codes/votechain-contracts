# VoteChain Frontend — Proposals Page

A lightweight, dependency-free frontend page that displays all governance proposals with state badges, vote summaries, countdown timers, search, filtering, and pagination.

## Structure

```
frontend/
├── index.html        # Main HTML page
├── src/
│   ├── styles.css    # All styles (WCAG 2.1 AA compliant)
│   └── proposals.js  # Rendering, filtering, pagination, countdown logic
└── README.md
```

## Running locally

No build step required. Open `frontend/index.html` directly in a browser:

```bash
open frontend/index.html
# or
xdg-open frontend/index.html
```

Or serve it with any static file server:

```bash
npx serve frontend
# or
python3 -m http.server 8080 --directory frontend
```

## Connecting to a live contract

In `src/proposals.js`, replace the `MOCK_PROPOSALS` array with a real fetch from your Stellar RPC endpoint. The expected shape of each proposal object matches the on-chain `Proposal` struct:

```js
{
  id:            u64,
  title:         string,
  proposer:      string,   // Stellar address (G...)
  votes_yes:     i128,
  votes_no:      i128,
  votes_abstain: i128,
  quorum:        i128,
  start_time:    u64,      // Unix timestamp (seconds)
  end_time:      u64,      // Unix timestamp (seconds)
  state:         string,   // "Active" | "Passed" | "Rejected" | "Executed" | "Cancelled"
  execute_after: u64,      // Unix timestamp; 0 if not applicable
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

## Internationalisation

The React application uses `react-i18next` with the English catalog at
`src/locales/en.json`. The browser language is detected from
`navigator.language`; English is the fallback for unsupported languages.

To add a locale, create another JSON file in `src/locales`, add it to the
`resources` map in `src/i18n.ts`, and include its language code in the
supported-language selection. Use the existing translation keys in components
with `useTranslation()` rather than adding visible strings directly to JSX.
