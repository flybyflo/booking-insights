import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/formatting"
import type { JournalLine } from "@/lib/types"

export function EvidenceLines({ lines }: { lines: JournalLine[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Document</TableHead>
          <TableHead>Line</TableHead>
          <TableHead>G/L</TableHead>
          <TableHead>Cost center</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>D/C</TableHead>
          <TableHead>Tax</TableHead>
          <TableHead>Partner</TableHead>
          <TableHead>Text</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={`${line.document_id}-${line.line_id}`}>
            <TableCell>{line.posting_date}</TableCell>
            <TableCell>{line.document_id}</TableCell>
            <TableCell>{line.line_id}</TableCell>
            <TableCell>{line.gl_account}</TableCell>
            <TableCell>{line.cost_center ?? "-"}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(line.amount, line.currency)}
            </TableCell>
            <TableCell>{line.debit_credit}</TableCell>
            <TableCell>{line.tax_code ?? "-"}</TableCell>
            <TableCell>{line.vendor_id ?? line.customer_id ?? "-"}</TableCell>
            <TableCell className="max-w-72 truncate">
              {line.booking_text}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
