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

## Workflow disclaimer

- I work on a MacBook and Arch Linux.
- I use Codex App, Codex CLI, and Cursor.
- For logic-heavy work I normally use Codex App, then run `/review` after the implementation is finished.
- For PRs I normally also use CodeRabbit or Greptile for PR review.
- I use Linear for issue management.
- For this task I mainly did code generation, roughly peeked into the code, inspected the UI, and wrote down issues I saw.
- I did not use AI PR review here, and I also did not run a local `/review`.
- With more time I would inspect the logic more deeply than I did here.

## Task 1 thoughts:

- Next.js + tailwind + shadcn/ui
- Convex for the backend (Normally I would use Postgres + Drizzle + trpc + tanstack query -> but convex is way faster to setup and use for rapid prototyping)

## Task 2 output

- Selected features:
  - Anomaly / Typo / Near-Duplicate Check
  - Duplicate Booking Detection
  - Booking Manual Suggestions

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

- Booking Manual Suggestions:
  - What: generates draft booking-manual checks from patterns that show up often in the ledger.
  - Why: it gives someone a quick starting point instead of making them write rules from a blank page.
  - Trade-off: it is intentionally rough and should be reviewed before anyone treats it as real policy.

- Self-review findings:
  - Duplicate typo-like anomaly findings could repeat the same root issue.
  - Scan output needed clearer wording around what was checked and why it was flagged.
  - Duplicate reason chips could run together visually and become hard to scan.
  - The Duplicates page repeated the same page context in the nav/header and body.
  - Heuristic findings should stay explainable because confidence scores can look more certain than they are.
  - Booking manual text-account rules can be based on only 3 matching examples with no dominance threshold, so seeded data can produce weak 3/6 or 3/5 "should normally use" recommendations.
  - Booking manual document-structure rules say "balanced documents", but the code only groups by account set and does not verify debit/credit totals, currency, or completeness.
  - The two booking manual issues above are noted but not fixed for this timebox.

- Follow-up fixes:
  - PR #2: `Deduplicate typo anomaly findings` deduplicates typo anomaly findings.
  - PR #2: `Clarify anomaly scan output` clarifies anomaly scan output.
  - PR #3: `Polish duplicate scan UI` makes duplicate reason chips wrap cleanly.
  - PR #3: `Polish duplicate scan UI` removes the repeated Duplicates body title.
