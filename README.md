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

## Task 2 thoughts:

- Add per-feature result tables
-- Best for: clear model and evidence-backed UI.
-- Trade-off: more schema/code per feature
- Normally for this kind of task I woudld create a queue of tasks with a worker that would process the tasks and update the results in the database.
-- But since this is a rapid prototype, I will just create the tables and the functions directly.
