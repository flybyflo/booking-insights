import { distance } from "fastest-levenshtein"

export type AnomalyType =
  | "TYPO_LIKE_TEXT"
  | "UNUSUAL_TEXT_ACCOUNT_COMBO"
  | "UNUSUAL_TAX_CODE"
  | "UNUSUAL_COST_CENTER"
  | "AMOUNT_OUTLIER"

export type JournalLineForAnomaly<TId = string> = {
  _id: TId
  document_id?: string
  gl_account: string
  cost_center?: string
  amount: number
  currency: string
  booking_text: string
  vendor_id?: string
  customer_id?: string
  tax_code?: string
}

export type AnomalyDraft<TId = string> = {
  type: AnomalyType
  title: string
  explanation: string
  severity: "low" | "medium" | "high"
  confidence: number
  criteria: string[]
  evidenceLineIds: TId[]
}

export function findAnomalies<TId>(
  lines: JournalLineForAnomaly<TId>[],
  limit = 25
): AnomalyDraft<TId>[] {
  return [
    ...findTypoLikeTexts(lines),
    ...findUnusualTextAccountCombos(lines),
    ...findUnusualTaxCodes(lines),
    ...findUnusualCostCenters(lines),
    ...findAmountOutliers(lines),
  ]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}

export function normalizeBookingText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(inv|invoice|rechnung|rg|beleg|document|doc)\b/g, "")
    .replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, "")
    .replace(/\b\d{2}[-/]\d{2}[-/]\d{4}\b/g, "")
    .replace(/\b\d{5,}\b/g, "")
    .replace(/\b\d+[,.]\d{2}\b/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function textTemplate(input: string): string {
  return normalizeBookingText(input)
    .replace(/\b(january|januar|jan)\b/g, "{month}")
    .replace(/\b(february|februar|feb)\b/g, "{month}")
    .replace(/\b(march|maerz|marz|mar)\b/g, "{month}")
    .replace(/\b(april|apr)\b/g, "{month}")
    .replace(/\b(may|mai)\b/g, "{month}")
    .replace(/\b(june|juni|jun)\b/g, "{month}")
    .replace(/\b(july|juli|jul)\b/g, "{month}")
    .replace(/\b(august|aug)\b/g, "{month}")
    .replace(/\b(september|sep)\b/g, "{month}")
    .replace(/\b(october|oktober|oct|okt)\b/g, "{month}")
    .replace(/\b(november|nov)\b/g, "{month}")
    .replace(/\b(december|dezember|dec|dez)\b/g, "{month}")
}

function textSimilarity(a: string, b: string): number {
  const left = normalizeBookingText(a)
  const right = normalizeBookingText(b)

  if (!left || !right) return 0
  if (left === right) return 1

  const maxLength = Math.max(left.length, right.length)
  return 1 - distance(left, right) / maxLength
}

function findTypoLikeTexts<TId>(
  lines: JournalLineForAnomaly<TId>[]
): AnomalyDraft<TId>[] {
  const findingsByTextPair = new Map<string, AnomalyDraft<TId>>()
  const candidates = Array.from(
    groupBy(
      lines.filter((line) => Math.abs(line.amount) > 0),
      (line) =>
        [
          line.document_id ?? String(line._id),
          line.booking_text,
          partnerId(line) ?? "no-partner",
        ].join(":")
    ).values()
  )

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const aLines = candidates[i]
      const bLines = candidates[j]
      const a = aLines[0]
      const b = bLines[0]

      if (
        !a ||
        !b ||
        a._id === b._id ||
        a.booking_text === b.booking_text ||
        (a.document_id && a.document_id === b.document_id)
      ) {
        continue
      }

      if (
        textTemplate(a.booking_text) === textTemplate(b.booking_text) ||
        numberlessText(a.booking_text) === numberlessText(b.booking_text) ||
        hasMonthToken(a.booking_text) !== hasMonthToken(b.booking_text) ||
        hasDocumentMarker(a.booking_text) !==
          hasDocumentMarker(b.booking_text) ||
        normalizeBookingText(a.booking_text).split(" ").length !==
          normalizeBookingText(b.booking_text).split(" ").length
      ) {
        continue
      }

      const similarity = textSimilarity(a.booking_text, b.booking_text)
      if (similarity < 0.86 || similarity >= 0.98) continue

      const samePartner = Boolean(partnerId(a)) && partnerId(a) === partnerId(b)
      const sameAccount = aLines.some((aLine) =>
        bLines.some((bLine) => aLine.gl_account === bLine.gl_account)
      )
      if (!samePartner && !sameAccount) continue

      const confidence = Math.min(
        95,
        Math.round(
          similarity * 75 + (samePartner ? 15 : 0) + (sameAccount ? 10 : 0)
        )
      )

      const textPairKey = [
        normalizeBookingText(a.booking_text),
        normalizeBookingText(b.booking_text),
        samePartner ? partnerId(a) : "no-partner",
      ]
        .sort()
        .join(":")
      const finding = {
        type: "TYPO_LIKE_TEXT",
        title: "Typo-like booking text variation",
        explanation: `"${a.booking_text}" and "${b.booking_text}" are very similar but not identical.`,
        severity: confidence >= 85 ? "high" : "medium",
        confidence,
        criteria: [
          `text similarity ${Math.round(similarity * 100)}%`,
          samePartner ? "same partner" : "partner not matched",
          sameAccount ? "same G/L account" : "different G/L account",
        ],
        evidenceLineIds: [
          ...aLines.slice(0, 3).map((line) => line._id),
          ...bLines.slice(0, 3).map((line) => line._id),
        ],
      } satisfies AnomalyDraft<TId>
      const existing = findingsByTextPair.get(textPairKey)

      if (!existing || finding.confidence > existing.confidence) {
        findingsByTextPair.set(textPairKey, finding)
      }
    }
  }

  return Array.from(findingsByTextPair.values()).slice(0, 8)
}

function findUnusualTextAccountCombos<TId>(
  lines: JournalLineForAnomaly<TId>[]
): AnomalyDraft<TId>[] {
  const findings: AnomalyDraft<TId>[] = []
  const byTemplate = groupBy(lines, (line) => textTemplate(line.booking_text))

  for (const [template, templateLines] of byTemplate.entries()) {
    if (templateLines.length < 5) continue

    const byAccount = groupBy(templateLines, (line) => line.gl_account)
    const sorted = Array.from(byAccount.entries()).sort(
      (a, b) => b[1].length - a[1].length
    )
    const dominant = sorted[0]
    if (!dominant) continue

    const [dominantAccount, dominantLines] = dominant
    const dominantRatio = dominantLines.length / templateLines.length
    if (dominantRatio < 0.65) continue

    for (const [account, accountLines] of sorted.slice(1)) {
      const accountRatio = accountLines.length / templateLines.length
      if (accountRatio > 0.2) continue

      for (const suspiciousLine of accountLines.slice(0, 2)) {
        const confidence = Math.round(60 + dominantRatio * 30)
        findings.push({
          type: "UNUSUAL_TEXT_ACCOUNT_COMBO",
          title: "Frequent booking text posted to unusual account",
          explanation: `"${template}" is usually posted to ${dominantAccount}, but this line uses ${account}.`,
          severity: confidence >= 85 ? "high" : "medium",
          confidence,
          criteria: [
            `${dominantLines.length}/${templateLines.length} similar lines use ${dominantAccount}`,
            `${accountLines.length}/${templateLines.length} similar lines use ${account}`,
          ],
          evidenceLineIds: [
            suspiciousLine._id,
            ...dominantLines.slice(0, 3).map((line) => line._id),
          ],
        })
      }
    }
  }

  return findings
}

function findUnusualTaxCodes<TId>(
  lines: JournalLineForAnomaly<TId>[]
): AnomalyDraft<TId>[] {
  return findDominantFieldAnomalies({
    lines: lines.filter((line) => Boolean(line.tax_code)),
    targetLabel: "tax code",
    targetValue: (line) => line.tax_code ?? "NONE",
    type: "UNUSUAL_TAX_CODE",
    title: "Unusual tax code for G/L account",
  })
}

function findUnusualCostCenters<TId>(
  lines: JournalLineForAnomaly<TId>[]
): AnomalyDraft<TId>[] {
  return findDominantFieldAnomalies({
    lines: lines.filter((line) => Boolean(line.cost_center)),
    targetLabel: "cost center",
    targetValue: (line) => line.cost_center ?? "NONE",
    type: "UNUSUAL_COST_CENTER",
    title: "Unusual cost center for G/L account",
  })
}

function findAmountOutliers<TId>(
  lines: JournalLineForAnomaly<TId>[]
): AnomalyDraft<TId>[] {
  const findings: AnomalyDraft<TId>[] = []
  const byComparableGroup = groupBy(
    lines.filter((line) => Math.abs(line.amount) > 0),
    (line) => `${textTemplate(line.booking_text)}:${line.gl_account}`
  )

  for (const [group, groupLines] of byComparableGroup.entries()) {
    if (groupLines.length < 5) continue

    const amounts = groupLines.map((line) => Math.abs(line.amount))
    const avg = amounts.reduce((sum, value) => sum + value, 0) / amounts.length
    const variance =
      amounts.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
      amounts.length
    const std = Math.sqrt(variance)
    if (std === 0) continue

    for (const line of groupLines) {
      const amount = Math.abs(line.amount)
      const zScore = Math.abs((amount - avg) / std)
      if (zScore < 2.5) continue

      const confidence = Math.min(95, Math.round(55 + zScore * 12))
      findings.push({
        type: "AMOUNT_OUTLIER",
        title: "Unusual amount for recurring booking pattern",
        explanation: `${amount.toFixed(2)} ${line.currency} is unusually far from the average ${avg.toFixed(2)} ${line.currency} for similar postings.`,
        severity: confidence >= 85 ? "high" : "medium",
        confidence,
        criteria: [
          `z-score ${zScore.toFixed(1)}`,
          `group ${group}`,
          `${groupLines.length} comparable lines`,
        ],
        evidenceLineIds: [
          line._id,
          ...groupLines
            .filter((candidate) => candidate._id !== line._id)
            .slice(0, 3)
            .map((candidate) => candidate._id),
        ],
      })
    }
  }

  return findings
}

function findDominantFieldAnomalies<TId>(args: {
  lines: JournalLineForAnomaly<TId>[]
  targetLabel: string
  targetValue: (line: JournalLineForAnomaly<TId>) => string
  type: "UNUSUAL_TAX_CODE" | "UNUSUAL_COST_CENTER"
  title: string
}): AnomalyDraft<TId>[] {
  const findings: AnomalyDraft<TId>[] = []
  const byAccount = groupBy(args.lines, (line) => line.gl_account)

  for (const [account, accountLines] of byAccount.entries()) {
    if (accountLines.length < 6) continue

    const byTarget = groupBy(accountLines, args.targetValue)
    const sorted = Array.from(byTarget.entries()).sort(
      (a, b) => b[1].length - a[1].length
    )
    const dominant = sorted[0]
    if (!dominant) continue

    const [dominantValue, dominantLines] = dominant
    const dominantRatio = dominantLines.length / accountLines.length
    if (dominantRatio < 0.7) continue

    for (const [rareValue, rareLines] of sorted.slice(1)) {
      const rareRatio = rareLines.length / accountLines.length
      if (rareRatio > 0.15) continue

      for (const suspiciousLine of rareLines.slice(0, 2)) {
        const confidence = Math.round(60 + dominantRatio * 30)
        findings.push({
          type: args.type,
          title: args.title,
          explanation: `Account ${account} usually uses ${args.targetLabel} ${dominantValue}, but this line uses ${rareValue}.`,
          severity: confidence >= 85 ? "high" : "medium",
          confidence,
          criteria: [
            `${dominantLines.length}/${accountLines.length} lines use ${dominantValue}`,
            `${rareLines.length}/${accountLines.length} lines use ${rareValue}`,
          ],
          evidenceLineIds: [
            suspiciousLine._id,
            ...dominantLines.slice(0, 3).map((line) => line._id),
          ],
        })
      }
    }
  }

  return findings
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

function partnerId<TId>(line: JournalLineForAnomaly<TId>): string | undefined {
  return line.vendor_id ?? line.customer_id
}

function hasDocumentMarker(input: string): boolean {
  return /\b(inv|invoice|rechnung|rg|beleg|document|doc)\b/i.test(input)
}

function hasMonthToken(input: string): boolean {
  return /\b(january|januar|jan|february|februar|feb|march|maerz|märz|marz|mar|april|apr|may|mai|june|juni|jun|july|juli|jul|august|aug|september|sep|october|oktober|oct|okt|november|nov|december|dezember|dec|dez)\b/i.test(
    input
  )
}

function numberlessText(input: string): string {
  return normalizeBookingText(input)
    .replace(/\b\d+\b/g, "")
    .trim()
}
