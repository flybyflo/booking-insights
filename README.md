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

- Selected features:
  - Anomaly / Typo / Near-Duplicate Check
  - Duplicate Booking Detection

- General Task 2 note:
  - The scans are currently triggered with a button for review/demo purposes.
  - In a production setup, these jobs should normally be triggered by time or domain events, pushed into a worker queue, and calculated by a dedicated worker.

- Anomaly / Typo / Near-Duplicate Check:
  - What: server-side scan over ledger lines with persisted findings and evidence rows.
  - Why: gives reviewers concrete suspicious lines instead of asking them to scan the full ledger manually.
  - Trade-off: no ML/LLM scoring; just simple explainable rules.

- Duplicate Booking Detection:
  - What: server-side duplicate scan over balanced journal documents with persisted candidate pairs and evidence rows.
  - Why: catches repeated invoices/bookings using amount, partner, text similarity, dates, accounts, and tax code.
  - Trade-off: no advanced search index; only compares balanced documents.

- Self-review findings:
  - Duplicate typo-like anomaly findings could repeat the same root issue.
  - Scan output needed clearer wording around what was checked and why it was flagged.
  - Duplicate reason chips could run together visually and become hard to scan.
  - The Duplicates page repeated the same page context in the nav/header and body.
  - Heuristic findings should stay explainable because confidence scores can look more certain than they are.

- Follow-up fixes:
  - PR #2: `Deduplicate typo anomaly findings` deduplicates typo anomaly findings.
  - PR #2: `Clarify anomaly scan output` clarifies anomaly scan output.
  - PR #3: `Polish duplicate scan UI` makes duplicate reason chips wrap cleanly.
  - PR #3: `Polish duplicate scan UI` removes the repeated Duplicates body title.
