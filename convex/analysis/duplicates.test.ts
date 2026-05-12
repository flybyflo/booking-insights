import { describe, expect, test } from "vitest"

import { findDuplicateBookings, type JournalLineForDuplicate } from "./duplicates"

function documentLines(
  documentId: string,
  overrides: Partial<JournalLineForDuplicate<string>> = {}
): JournalLineForDuplicate<string>[] {
  const base = {
    document_id: documentId,
    posting_date: "2026-03-10",
    currency: "EUR",
    booking_text: "Adobe Creative Cloud March",
    vendor_id: "AT-V-1001",
    tax_code: "V20",
    cost_center: "AT-VIE-IT",
    ...overrides,
  }

  return [
    {
      _id: `${documentId}-1`,
      line_id: 1,
      gl_account: "6500",
      amount: 100,
      debit_credit: "D",
      ...base,
    },
    {
      _id: `${documentId}-2`,
      line_id: 2,
      gl_account: "2500",
      amount: 20,
      debit_credit: "D",
      ...base,
    },
    {
      _id: `${documentId}-3`,
      line_id: 3,
      gl_account: overrides.gl_account ?? "3300",
      amount: -120,
      debit_credit: "C",
      cost_center: undefined,
      tax_code: undefined,
      document_id: base.document_id,
      posting_date: base.posting_date,
      currency: base.currency,
      booking_text: base.booking_text,
      vendor_id: base.vendor_id,
      customer_id: base.customer_id,
    },
  ]
}

describe("findDuplicateBookings", () => {
  test("flags two similar documents with same amount, partner, text, and close dates", () => {
    const findings = findDuplicateBookings([
      ...documentLines("510000100"),
      ...documentLines("510000101", {
        posting_date: "2026-03-12",
        booking_text: "Adobe Creative Cloud Maerch",
      }),
    ])

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentIds: ["510000100", "510000101"],
          confidence: expect.any(Number),
          evidenceLineIds: expect.arrayContaining([
            "510000100-1",
            "510000101-1",
          ]),
        }),
      ])
    )
    expect(findings[0]?.confidence).toBeGreaterThanOrEqual(70)
  })

  test("does not compare lines from the same document id as duplicates", () => {
    const findings = findDuplicateBookings(documentLines("510000100"))

    expect(findings).toHaveLength(0)
  })

  test("does not flag same amount with unrelated text and partner", () => {
    const findings = findDuplicateBookings([
      ...documentLines("510000100"),
      ...documentLines("510000101", {
        posting_date: "2026-03-11",
        booking_text: "Office chair replacement",
        vendor_id: "AT-V-9999",
      }),
    ])

    expect(findings).toHaveLength(0)
  })

  test("does not flag a weak match when only amount and close date match", () => {
    const findings = findDuplicateBookings([
      ...documentLines("510000100", {
        tax_code: "V20",
        cost_center: "AT-VIE-IT",
      }),
      ...documentLines("510000101", {
        posting_date: "2026-03-11",
        booking_text: "Quarterly insurance premium",
        vendor_id: "AT-V-7777",
        tax_code: "V00",
        cost_center: "AT-VIE-FIN",
        gl_account: "7700",
      }),
    ])

    expect(findings).toHaveLength(0)
  })

  test("each finding includes two document ids and evidence lines", () => {
    const findings = findDuplicateBookings([
      ...documentLines("510000100"),
      ...documentLines("510000101", {
        posting_date: "2026-03-12",
        booking_text: "Adobe Creative Cloud Maerch",
      }),
    ])

    expect(findings.length).toBeGreaterThan(0)
    expect(
      findings.every(
        (finding) =>
          finding.documentIds.length === 2 && finding.evidenceLineIds.length > 0
      )
    ).toBe(true)
  })
})
