# Booking Insights

```bash
pnpm i
pnpm dev
```

If Convex initializes on the first `pnpm dev`, kill that process and run `pnpm dev` again.

```bash
pnpm seed
```

The seed command imports `data/journal_entries.json` into the `journalLines` table.

## Time spent

- Started working: 2026-05-12 12:45:00 CEST
- First commit: 2026-05-12 13:08:36 CEST
- Last commit: 2026-05-12 15:28:15 CEST
- Total time: 2h 43m 15s

## Data assumptions

- The dataset is synthetic SAP-style journal entry data with one `document_id` and multiple `line_id` rows per document.
- Every document is balanced by signed `amount`; debit lines are positive and credit lines are negative.
- Account ranges are simplified: `4xxx` revenue, `5xxx/6xxx` expenses, `1xxx/2xxx` balance-sheet and tax/vendor/customer clearing accounts.

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

## Task 3 - Context Engineering / Knowledge Graph

- I would connect the most important company context sources: policies, SOPs, CRM notes, relevant emails, the data dictionary, KPI docs, approvals, and transaction data.
- This can get messy in real companies because the important context is often spread across shared drives, emails, legacy tools, and random docs.
- The main entities would be `KPI`, `Definition`, `Owner`, `Query/Transformation`, `Approval`, `Document`, `Customer`, `Deal`, `Discount`, and `Transaction`.
- The important relationships would connect these things, for example `KPI -> Definition -> Query -> Owner -> Approval -> Document` or `Discount -> Customer/Deal -> CRM Note/Email -> Approval`.
- Retrieval should combine vector search and graph retrieval. Vector search is useful for relevant text in policies, SOPs, emails, or CRM notes. Graph retrieval is useful for explicit links, like which owner belongs to a KPI or which approval belongs to a discount.
- In general the agent should work evidence-first: first collect the relevant sources and examples, and only then generate an answer with reason, evidence, and confidence. I would also make this visible in the UI, because otherwise it quickly feels like a black box.
- Risk: outdated or wrong context. Mitigation: documents need versions, validity dates, and approval status. Official policies should rank higher than informal notes or random emails.
- Risk: the agent makes up explanations. Mitigation: it should not answer important questions without evidence, should show the sources it used, and should mark uncertain answers clearly.
- Note on tool design: If the number of tools grows too much, I would look at code-mode style tools like [Cloudflare Code Mode](https://blog.cloudflare.com/code-mode/) or [train-mcp](https://github.com/flybyflo/train-mcp), where the agent writes small sandboxed TypeScript scripts against a typed internal API instead of calling hundreds of separate tools. This can reduce tool/context overhead, but needs strong sandboxing, permissions, and logging.
- This also fits graph traversal well: the agent could write a small TypeScript function that starts from a KPI or transaction, follows typed graph edges to definitions, owners, approvals, and documents, and then mixes those results with vector-search evidence before answering.
- Goal: not just "this is the number", but "this is how it was calculated, why it is valid, and which evidence supports it."
