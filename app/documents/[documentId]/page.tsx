import { DocumentLineTable } from "@/components/dashboard/DocumentLineTable"
import { WorkspaceShell } from "@/components/workspace-shell"

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>
}) {
  const { documentId } = await params

  return (
    <WorkspaceShell>
      <div className="py-6">
        <DocumentLineTable
          documentId={documentId}
          titleId="document-lines-title"
        />
      </div>
    </WorkspaceShell>
  )
}
