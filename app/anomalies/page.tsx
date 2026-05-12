import { AnomalyScanPanel } from "@/components/dashboard/AnomalyScanPanel"
import { WorkspaceShell } from "@/components/workspace-shell"

export default function AnomaliesPage() {
  return (
    <WorkspaceShell>
      <AnomalyScanPanel />
    </WorkspaceShell>
  )
}
