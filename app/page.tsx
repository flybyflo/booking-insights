import { cookies } from "next/headers"

import { JournalTable } from "@/components/dashboard/JournalTable"
import { WorkspaceShell } from "@/components/workspace-shell"
import {
  JOURNAL_TABLE_STATE_COOKIE,
  parseJournalTableState,
} from "@/lib/journal-table-state"

export default async function Page() {
  const cookieStore = await cookies()
  const initialTableState = parseJournalTableState(
    cookieStore.get(JOURNAL_TABLE_STATE_COOKIE)?.value
  )

  return (
    <WorkspaceShell>
      <div className="py-6">
        <JournalTable
          initialTableState={initialTableState}
          titleId="journal-lines-title"
        />
      </div>
    </WorkspaceShell>
  )
}
