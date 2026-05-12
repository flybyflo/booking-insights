# Booking Insights

```bash
pnpm i
pnpm dev
```
```bash
pnpm seed
```

The seed command imports `data/journal_entries.json` into the `journalLines` table.

```bash
pnpm build
pnpm start
```

## Task 1 thoughts:

- Next.js + tailwind + shadcn/ui
- Convex for the backend (Normally I would use Postgres + Drizzle + trpc + tanstack query -> but convex is way faster to setup and use for rapid prototyping)

## Task 2 output

- Features: Anomaly / Typo / Near-Duplicate Check, Duplicate Booking Detection, Booking Manual / Rule Suggestions.
- Feature PR: https://github.com/flybyflo/booking-insights/pull/2 (also includes the findings)
- Feature trade-offs: explainable heuristics, possible false positives, human review still required.
- Fixed in PR #2: `ce2a213` deduplicates typo findings, `56a52aa` clarifies scan output.
