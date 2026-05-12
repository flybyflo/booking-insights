import { distance } from "fastest-levenshtein"

import { normalizeBookingText } from "./anomaly"

export type JournalLineForDuplicate<TId = string> = {
  _id: TId
  document_id: string
  posting_date: string
  line_id: number
  gl_account: string
  cost_center?: string
  amount: number
  currency: string
  debit_credit: "D" | "C"
  booking_text: string
  vendor_id?: string
  customer_id?: string
  tax_code?: string
}

export type DuplicateDraft<TId = string> = {
  title: string
  explanation: string
  confidence: number
  criteria: string[]
  documentIds: string[]
  evidenceLineIds: TId[]
}

type JournalDocument<TId> = {
  document_id: string
  posting_date: string
  dateValue: number
  booking_text: string
  normalizedText: string
  partner?: string
  currency: string
  grossAmount: number
  netBalance: number
  accounts: Set<string>
  costCenters: Set<string>
  taxCodes: Set<string>
  debitAccounts: Set<string>
  creditAccounts: Set<string>
  lines: JournalLineForDuplicate<TId>[]
}

export function findDuplicateBookings<TId>(
  lines: JournalLineForDuplicate<TId>[],
  limit = 25
): DuplicateDraft<TId>[] {
  const documents = buildDocuments(lines)
  const findings: DuplicateDraft<TId>[] = []

  for (let i = 0; i < documents.length; i++) {
    for (let j = i + 1; j < documents.length; j++) {
      const left = documents[i]
      const right = documents[j]
      if (!left || !right) continue

      const dayGap = daysBetween(left.dateValue, right.dateValue)
      if (dayGap > 7) continue

      const finding = scoreDocumentPair(left, right, dayGap)
      if (finding && finding.confidence >= 70) {
        findings.push(finding)
      }
    }
  }

  return findings
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        a.documentIds.join(":").localeCompare(b.documentIds.join(":"))
    )
    .slice(0, limit)
}

export function buildDocuments<TId>(
  lines: JournalLineForDuplicate<TId>[]
): JournalDocument<TId>[] {
  const byDocument = groupBy(lines, (line) => line.document_id)

  return Array.from(byDocument.entries())
    .map(([documentId, documentLines]) => {
      const sortedLines = [...documentLines].sort((a, b) => a.line_id - b.line_id)
      const primaryLine =
        sortedLines.find((line) => line.debit_credit === "D") ?? sortedLines[0]
      const accounts = new Set(sortedLines.map((line) => line.gl_account))
      const costCenters = new Set(
        sortedLines
          .map((line) => line.cost_center)
          .filter((value): value is string => Boolean(value))
      )
      const taxCodes = new Set(
        sortedLines
          .map((line) => line.tax_code)
          .filter((value): value is string => Boolean(value))
      )
      const debitAccounts = new Set(
        sortedLines
          .filter((line) => line.debit_credit === "D")
          .map((line) => line.gl_account)
      )
      const creditAccounts = new Set(
        sortedLines
          .filter((line) => line.debit_credit === "C")
          .map((line) => line.gl_account)
      )
      const grossAmount = sortedLines
        .filter((line) => line.debit_credit === "D")
        .reduce((sum, line) => sum + Math.abs(line.amount), 0)
      const postingDate = sortedLines[0]?.posting_date ?? ""
      const bookingText = primaryLine?.booking_text ?? ""

      return {
        document_id: documentId,
        posting_date: postingDate,
        dateValue: Date.parse(`${postingDate}T00:00:00.000Z`),
        booking_text: bookingText,
        normalizedText: normalizeBookingText(bookingText),
        partner: partnerId(sortedLines),
        currency: sortedLines[0]?.currency ?? "EUR",
        grossAmount: roundMoney(grossAmount),
        netBalance: roundMoney(
          sortedLines.reduce((sum, line) => sum + line.amount, 0)
        ),
        accounts,
        costCenters,
        taxCodes,
        debitAccounts,
        creditAccounts,
        lines: sortedLines,
      }
    })
    .filter((document) => Number.isFinite(document.dateValue))
    .sort((a, b) =>
      a.posting_date === b.posting_date
        ? a.document_id.localeCompare(b.document_id)
        : a.posting_date.localeCompare(b.posting_date)
    )
}

function scoreDocumentPair<TId>(
  left: JournalDocument<TId>,
  right: JournalDocument<TId>,
  dayGap: number
): DuplicateDraft<TId> | null {
  if (left.document_id === right.document_id) return null
  if (isLikelyReversal(left, right)) return null

  const criteria: string[] = []
  let score = 0
  const sameGrossAmount =
    left.currency === right.currency &&
    Math.abs(left.grossAmount - right.grossAmount) < 0.01

  if (!sameGrossAmount) return null

  score += 30
  criteria.push(`same gross amount ${left.grossAmount.toFixed(2)} ${left.currency}`)

  if (left.partner && left.partner === right.partner) {
    score += 20
    criteria.push(`same partner ${left.partner}`)
  }

  const similarity = textSimilarity(left.normalizedText, right.normalizedText)
  if (similarity >= 0.82) {
    score += 20
    criteria.push(`text similarity ${Math.round(similarity * 100)}%`)
  }

  const accountOverlap = intersection(left.accounts, right.accounts)
  if (accountOverlap.length > 0) {
    score += 15
    criteria.push(`overlapping G/L accounts ${accountOverlap.slice(0, 4).join(", ")}`)
  }

  if (dayGap <= 3) {
    score += 10
    criteria.push(`posting dates ${dayGap} day${dayGap === 1 ? "" : "s"} apart`)
  } else if (dayGap <= 7) {
    score += 5
    criteria.push(`posting dates ${dayGap} days apart`)
  }

  const taxOverlap = intersection(left.taxCodes, right.taxCodes)
  const costCenterOverlap = intersection(left.costCenters, right.costCenters)
  if (taxOverlap.length > 0 || costCenterOverlap.length > 0) {
    score += 5
    criteria.push(
      taxOverlap.length > 0
        ? `matching tax code ${taxOverlap[0]}`
        : `matching cost center ${costCenterOverlap[0]}`
    )
  }

  const confidence = Math.min(95, score)
  if (confidence < 70) return null

  return {
    title: "Potential duplicate booking",
    explanation: `${left.document_id} and ${right.document_id} look like the same business event posted within a short time window.`,
    confidence,
    criteria,
    documentIds: [left.document_id, right.document_id],
    evidenceLineIds: [
      ...left.lines.map((line) => line._id),
      ...right.lines.map((line) => line._id),
    ],
  }
}

function isLikelyReversal<TId>(
  left: JournalDocument<TId>,
  right: JournalDocument<TId>
) {
  return (
    Math.abs(left.grossAmount - right.grossAmount) < 0.01 &&
    sameSet(left.debitAccounts, right.creditAccounts) &&
    sameSet(left.creditAccounts, right.debitAccounts)
  )
}

function partnerId<TId>(lines: JournalLineForDuplicate<TId>[]) {
  return lines.find((line) => line.vendor_id || line.customer_id)?.vendor_id ??
    lines.find((line) => line.vendor_id || line.customer_id)?.customer_id
}

function textSimilarity(left: string, right: string): number {
  if (!left || !right) return 0
  if (left === right) return 1

  const maxLength = Math.max(left.length, right.length)
  return 1 - distance(left, right) / maxLength
}

function daysBetween(left: number, right: number) {
  return Math.round(Math.abs(left - right) / 86_400_000)
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function intersection(left: Set<string>, right: Set<string>) {
  return Array.from(left).filter((value) => right.has(value)).sort()
}

function sameSet(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false
  return Array.from(left).every((value) => right.has(value))
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()

  for (const item of items) {
    const key = keyFn(item)
    const existing = map.get(key) ?? []
    existing.push(item)
    map.set(key, existing)
  }

  return map
}
