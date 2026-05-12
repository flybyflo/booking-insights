import { DuplicateScanPanel } from "@/components/dashboard/DuplicateScanPanel"
import { WorkspaceShell } from "@/components/workspace-shell"

export default function DuplicatesPage() {
  return (
    <WorkspaceShell>
      <DuplicateScanPanel />
    </WorkspaceShell>
  )
}
