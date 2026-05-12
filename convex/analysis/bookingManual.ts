import { textTemplate } from "./anomaly"

export type ManualRuleType =
  | "ACCOUNT_TAX_CODE"
  | "ACCOUNT_COST_CENTER"
  | "TEXT_ACCOUNT"
  | "PARTNER_ACCOUNT"
  | "DOCUMENT_STRUCTURE"

export type JournalLineForManual<TId = string> = {
  _id: TId
  document_id: string
  line_id: number
  gl_account: string
  gl_account_name?: string
  cost_center?: string
  amount: number
  currency: string
  debit_credit: "D" | "C"
  booking_text: string
  vendor_id?: string
  customer_id?: string
  tax_code?: string
}

export type ManualRuleSuggestion<TId = string> = {
  ruleType: ManualRuleType
  title: string
  recommendation: string
  rationale: string
  confidence: number
  criteria: string[]
  supportCount: number
  evidenceLineIds: TId[]
}

export function generateManualRules<TId>(
  lines: JournalLineForManual<TId>[],
  limit = 8
): ManualRuleSuggestion<TId>[] {
  const suggestions = [
    ...accountTaxCodeRules(lines),
    ...accountCostCenterRules(lines),
    ...textAccountRules(lines),
    ...partnerAccountRules(lines),
    ...documentStructureRules(lines),
  ]

  return selectDiverseRules(dedupeRules(suggestions), Math.min(10, limit))
}

function accountTaxCodeRules<TId>(
  lines: JournalLineForManual<TId>[]
): ManualRuleSuggestion<TId>[] {
  const rules: ManualRuleSuggestion<TId>[] = []
  const byAccount = groupBy(
    lines.filter((line) => Boolean(line.tax_code)),
    (line) => line.gl_account
  )

  for (const [account, accountLines] of byAccount.entries()) {
    if (accountLines.length < 5) continue

    const dominant = dominantGroup(accountLines, (line) => line.tax_code ?? "-")
    if (!dominant || dominant.ratio < 0.7) continue

    const accountName = accountLines[0]?.gl_account_name
    const confidence = Math.min(95, Math.round(55 + dominant.ratio * 40))

    rules.push({
      ruleType: "ACCOUNT_TAX_CODE",
      title: `Use tax code ${dominant.key} for account ${account}`,
      recommendation: `Post ${accountLabel(account, accountName)} with tax code ${dominant.key} unless there is documented business context.`,
      rationale: `${dominant.count} of ${accountLines.length} historical lines for this account use tax code ${dominant.key}.`,
      confidence,
      criteria: [
        `${dominant.count}/${accountLines.length} account lines use ${dominant.key}`,
        `dominant ratio ${Math.round(dominant.ratio * 100)}%`,
      ],
      supportCount: dominant.count,
      evidenceLineIds: dominant.lines.slice(0, 5).map((line) => line._id),
    })
  }

  return rules
}

function accountCostCenterRules<TId>(
  lines: JournalLineForManual<TId>[]
): ManualRuleSuggestion<TId>[] {
  const rules: ManualRuleSuggestion<TId>[] = []
  const byAccount = groupBy(
    lines.filter((line) => Boolean(line.cost_center)),
    (line) => line.gl_account
  )

  for (const [account, accountLines] of byAccount.entries()) {
    if (accountLines.length < 4) continue

    const dominant = dominantGroup(accountLines, (line) => line.cost_center ?? "-")
    if (!dominant || dominant.count < 3 || dominant.ratio < 0.4) continue

    const accountName = accountLines[0]?.gl_account_name
    const confidence = Math.min(92, Math.round(52 + dominant.ratio * 38))

    rules.push({
      ruleType: "ACCOUNT_COST_CENTER",
      title: `Use cost center ${dominant.key} for account ${account}`,
      recommendation: `Default ${accountLabel(account, accountName)} to cost center ${dominant.key} when no stronger allocation signal exists.`,
      rationale: `${dominant.count} of ${accountLines.length} historical lines for this account use cost center ${dominant.key}.`,
      confidence,
      criteria: [
        `${dominant.count}/${accountLines.length} account lines use ${dominant.key}`,
        `dominant ratio ${Math.round(dominant.ratio * 100)}%`,
      ],
      supportCount: dominant.count,
      evidenceLineIds: dominant.lines.slice(0, 5).map((line) => line._id),
    })
  }

  return rules
}

function textAccountRules<TId>(
  lines: JournalLineForManual<TId>[]
): ManualRuleSuggestion<TId>[] {
  const rules: ManualRuleSuggestion<TId>[] = []
  const byTemplate = groupBy(
    lines.filter((line) => line.debit_credit === "D" && Math.abs(line.amount) > 0),
    (line) => textTemplate(line.booking_text)
  )

  for (const [template, templateLines] of byTemplate.entries()) {
    if (templateLines.length < 3) continue

    const dominant = dominantGroup(templateLines, (line) => line.gl_account)
    if (!dominant || dominant.count < 3) continue

    const confidence = Math.min(90, Math.round(50 + dominant.ratio * 40))

    rules.push({
      ruleType: "TEXT_ACCOUNT",
      title: `Map "${template}" to account ${dominant.key}`,
      recommendation: `Recurring booking text "${template}" should normally use G/L account ${dominant.key}.`,
      rationale: `${dominant.count} matching debit lines use the same text template and account.`,
      confidence,
      criteria: [
        `${dominant.count}/${templateLines.length} matching lines use account ${dominant.key}`,
        `template ${template}`,
      ],
      supportCount: dominant.count,
      evidenceLineIds: dominant.lines.slice(0, 5).map((line) => line._id),
    })
  }

  return rules
}

function partnerAccountRules<TId>(
  lines: JournalLineForManual<TId>[]
): ManualRuleSuggestion<TId>[] {
  const rules: ManualRuleSuggestion<TId>[] = []
  const byPartner = groupBy(
    lines.filter((line) => Boolean(partnerId(line)) && line.debit_credit === "D"),
    (line) => partnerId(line) ?? "-"
  )

  for (const [partner, partnerLines] of byPartner.entries()) {
    if (partnerLines.length < 3) continue

    const dominant = dominantGroup(partnerLines, (line) => line.gl_account)
    if (!dominant || dominant.count < 3 || dominant.ratio < 0.6) continue

    const confidence = Math.min(88, Math.round(48 + dominant.ratio * 40))

    rules.push({
      ruleType: "PARTNER_ACCOUNT",
      title: `Default partner ${partner} to account ${dominant.key}`,
      recommendation: `Supplier/customer ${partner} should normally post debit-side lines to G/L account ${dominant.key}.`,
      rationale: `${dominant.count} of ${partnerLines.length} debit lines for this partner use account ${dominant.key}.`,
      confidence,
      criteria: [
        `${dominant.count}/${partnerLines.length} partner lines use ${dominant.key}`,
        `partner ${partner}`,
      ],
      supportCount: dominant.count,
      evidenceLineIds: dominant.lines.slice(0, 5).map((line) => line._id),
    })
  }

  return rules
}

function documentStructureRules<TId>(
  lines: JournalLineForManual<TId>[]
): ManualRuleSuggestion<TId>[] {
  const documents = Array.from(groupBy(lines, (line) => line.document_id).values())
  const byStructure = groupBy(documents, (documentLines) =>
    Array.from(new Set(documentLines.map((line) => line.gl_account)))
      .sort()
      .join(" + ")
  )

  const rules: ManualRuleSuggestion<TId>[] = []

  for (const [structure, documentGroups] of byStructure.entries()) {
    if (documentGroups.length < 3 || !structure.includes("+")) continue

    const evidenceLines = documentGroups
      .slice(0, 3)
      .flatMap((documentLines) =>
        [...documentLines].sort((a, b) => a.line_id - b.line_id)
      )
      .slice(0, 5)

    rules.push({
      ruleType: "DOCUMENT_STRUCTURE",
      title: `Common document structure: ${structure}`,
      recommendation: `Use the account structure ${structure} for matching recurring document patterns.`,
      rationale: `${documentGroups.length} balanced documents use this account combination.`,
      confidence: Math.min(86, 55 + documentGroups.length * 5),
      criteria: [
        `${documentGroups.length} documents share this account structure`,
        `accounts ${structure}`,
      ],
      supportCount: documentGroups.length,
      evidenceLineIds: evidenceLines.map((line) => line._id),
    })
  }

  return rules
}

function dominantGroup<TId>(
  lines: JournalLineForManual<TId>[],
  keyFn: (line: JournalLineForManual<TId>) => string
) {
  const groups = Array.from(groupBy(lines, keyFn).entries()).sort(
    (a, b) => b[1].length - a[1].length
  )
  const top = groups[0]
  if (!top) return null

  return {
    key: top[0],
    lines: top[1],
    count: top[1].length,
    ratio: top[1].length / lines.length,
  }
}

function dedupeRules<TId>(rules: ManualRuleSuggestion<TId>[]) {
  const byKey = new Map<string, ManualRuleSuggestion<TId>>()

  for (const rule of rules) {
    const key = `${rule.ruleType}:${rule.title}`
    const current = byKey.get(key)

    if (
      !current ||
      rule.confidence > current.confidence ||
      rule.supportCount > current.supportCount
    ) {
      byKey.set(key, rule)
    }
  }

  return Array.from(byKey.values())
}

function selectDiverseRules<TId>(
  rules: ManualRuleSuggestion<TId>[],
  limit: number
) {
  const sorted = [...rules].sort(compareRules)
  const selected: ManualRuleSuggestion<TId>[] = []
  const maxPerType: Record<ManualRuleType, number> = {
    ACCOUNT_TAX_CODE: 2,
    ACCOUNT_COST_CENTER: 2,
    TEXT_ACCOUNT: 2,
    PARTNER_ACCOUNT: 1,
    DOCUMENT_STRUCTURE: 1,
  }

  for (const type of [
    "ACCOUNT_COST_CENTER",
    "TEXT_ACCOUNT",
    "PARTNER_ACCOUNT",
    "DOCUMENT_STRUCTURE",
    "ACCOUNT_TAX_CODE",
  ] satisfies ManualRuleType[]) {
    const best = sorted.find((rule) => rule.ruleType === type)
    if (best) {
      selected.push(best)
    }
  }

  for (const rule of sorted) {
    if (selected.length >= limit) break
    if (selected.includes(rule)) continue
    if (
      selected.filter((selectedRule) => selectedRule.ruleType === rule.ruleType)
        .length >= maxPerType[rule.ruleType]
    ) {
      continue
    }
    selected.push(rule)
  }

  for (const rule of sorted) {
    if (selected.length >= limit) break
    if (selected.includes(rule)) continue
    selected.push(rule)
  }

  return selected.sort(compareRules).slice(0, limit)
}

function compareRules<TId>(
  a: ManualRuleSuggestion<TId>,
  b: ManualRuleSuggestion<TId>
) {
  return (
    b.confidence - a.confidence ||
    b.supportCount - a.supportCount ||
    a.title.localeCompare(b.title)
  )
}

function partnerId<TId>(line: JournalLineForManual<TId>) {
  return line.vendor_id ?? line.customer_id
}

function accountLabel(account: string, name: string | undefined) {
  return name ? `${account} ${name}` : `account ${account}`
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
