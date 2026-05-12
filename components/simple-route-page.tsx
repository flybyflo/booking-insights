import { WorkspaceShell } from "@/components/workspace-shell"

export function SimpleRoutePage({ title }: { title: string }) {
  return (
    <WorkspaceShell>
      <section aria-labelledby="page-title" className="px-4 py-6 lg:px-6">
        <h1 id="page-title" className="text-2xl font-semibold">
          {title}
        </h1>
      </section>
    </WorkspaceShell>
  )
}
