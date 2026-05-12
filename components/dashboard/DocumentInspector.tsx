import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { JournalLine } from "@/lib/types"
import { EvidenceLines } from "./EvidenceLines"

export function DocumentInspector({
  lines,
  open,
  onOpenChange,
}: {
  lines: JournalLine[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const documentId = lines[0]?.document_id ?? "Document"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{documentId}</DialogTitle>
        </DialogHeader>
        <EvidenceLines lines={lines} />
      </DialogContent>
    </Dialog>
  )
}
