import { describe, expect, test } from "vitest"

import { findAnomalies, type JournalLineForAnomaly } from "./anomaly"

function line(
  id: string,
  overrides: Partial<JournalLineForAnomaly<string>>
): JournalLineForAnomaly<string> {
  return {
    _id: id,
    document_id: id,
    gl_account: "6500",
    amount: 100,
    currency: "EUR",
    booking_text: "Adobe Creative Cloud March",
    vendor_id: "AT-V-1001",
    tax_code: "V20",
    cost_center: "AT-VIE-IT",
    ...overrides,
  }
}

describe("findAnomalies", () => {
  test("flags typo-like booking text pairs", () => {
    const findings = findAnomalies([
      line("a", { booking_text: "Adobe Creative Cloud March" }),
      line("b", { booking_text: "Adboe Creative Cloud March" }),
    ])

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "TYPO_LIKE_TEXT",
          evidenceLineIds: ["a", "b"],
        }),
      ])
    )
  })

  test("does not flag identical text as typo-like", () => {
    const findings = findAnomalies([
      line("a", { booking_text: "Adobe Creative Cloud March" }),
      line("b", { booking_text: "Adobe Creative Cloud March" }),
    ])

    expect(findings.some((finding) => finding.type === "TYPO_LIKE_TEXT")).toBe(
      false
    )
  })

  test("deduplicates typo-like findings across document line items", () => {
    const findings = findAnomalies([
      line("a1", {
        document_id: "doc-a",
        booking_text: "Adobe Creative Cloud March",
        gl_account: "6500",
      }),
      line("a2", {
        document_id: "doc-a",
        booking_text: "Adobe Creative Cloud March",
        gl_account: "2500",
      }),
      line("a3", {
        document_id: "doc-a",
        booking_text: "Adobe Creative Cloud March",
        gl_account: "3300",
      }),
      line("b1", {
        document_id: "doc-b",
        booking_text: "Adboe Creative Cloud March",
        gl_account: "6500",
      }),
      line("b2", {
        document_id: "doc-b",
        booking_text: "Adboe Creative Cloud March",
        gl_account: "2500",
      }),
      line("b3", {
        document_id: "doc-b",
        booking_text: "Adboe Creative Cloud March",
        gl_account: "3300",
      }),
    ])
    const typoFindings = findings.filter(
      (finding) => finding.type === "TYPO_LIKE_TEXT"
    )

    expect(typoFindings).toHaveLength(1)
    expect(typoFindings[0]?.evidenceLineIds).toEqual([
      "a1",
      "a2",
      "a3",
      "b1",
      "b2",
      "b3",
    ])
  })

  test("flags a rare account for a frequent booking text template", () => {
    const findings = findAnomalies([
      line("a", {
        booking_text: "HubSpot subscription March",
        gl_account: "6500",
      }),
      line("b", {
        booking_text: "HubSpot subscription April",
        gl_account: "6500",
      }),
      line("c", {
        booking_text: "HubSpot subscription May",
        gl_account: "6500",
      }),
      line("d", {
        booking_text: "HubSpot subscription June",
        gl_account: "6500",
      }),
      line("e", {
        booking_text: "HubSpot subscription July",
        gl_account: "6000",
      }),
    ])

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "UNUSUAL_TEXT_ACCOUNT_COMBO",
          evidenceLineIds: expect.arrayContaining(["e"]),
        }),
      ])
    )
  })

  test("flags a rare tax code for a dominant account pattern", () => {
    const findings = findAnomalies([
      line("a", { gl_account: "7600", tax_code: "V20" }),
      line("b", { gl_account: "7600", tax_code: "V20" }),
      line("c", { gl_account: "7600", tax_code: "V20" }),
      line("d", { gl_account: "7600", tax_code: "V20" }),
      line("e", { gl_account: "7600", tax_code: "V20" }),
      line("f", { gl_account: "7600", tax_code: "V20" }),
      line("g", { gl_account: "7600", tax_code: "V00" }),
    ])

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "UNUSUAL_TAX_CODE",
          evidenceLineIds: expect.arrayContaining(["g"]),
        }),
      ])
    )
  })

  test("all findings contain evidence line ids", () => {
    const findings = findAnomalies([
      line("a", { booking_text: "Adobe Creative Cloud March" }),
      line("b", { booking_text: "Adboe Creative Cloud March" }),
      line("c", {
        booking_text: "HubSpot subscription March",
        gl_account: "6500",
      }),
      line("d", {
        booking_text: "HubSpot subscription April",
        gl_account: "6500",
      }),
      line("e", {
        booking_text: "HubSpot subscription May",
        gl_account: "6500",
      }),
      line("f", {
        booking_text: "HubSpot subscription June",
        gl_account: "6500",
      }),
      line("g", {
        booking_text: "HubSpot subscription July",
        gl_account: "6000",
      }),
    ])

    expect(findings.length).toBeGreaterThan(0)
    expect(
      findings.every((finding) => finding.evidenceLineIds.length > 0)
    ).toBe(true)
  })
})
