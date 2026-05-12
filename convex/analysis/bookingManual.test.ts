import { describe, expect, test } from "vitest"

import {
  generateManualRules,
  type JournalLineForManual,
} from "./bookingManual"

function line(
  id: string,
  overrides: Partial<JournalLineForManual<string>> = {}
): JournalLineForManual<string> {
  return {
    _id: id,
    document_id: `doc-${id}`,
    line_id: 1,
    gl_account: "6500",
    gl_account_name: "Software und SaaS",
    cost_center: "AT-VIE-IT",
    amount: 100,
    currency: "EUR",
    debit_credit: "D",
    booking_text: "Adobe Creative Cloud March",
    vendor_id: "AT-V-1001",
    tax_code: "V20",
    ...overrides,
  }
}

describe("generateManualRules", () => {
  test("generates an account tax-code check from a dominant pattern", () => {
    const rules = generateManualRules([
      line("a", { gl_account: "7600", tax_code: "V20" }),
      line("b", { gl_account: "7600", tax_code: "V20" }),
      line("c", { gl_account: "7600", tax_code: "V20" }),
      line("d", { gl_account: "7600", tax_code: "V20" }),
      line("e", { gl_account: "7600", tax_code: "V20" }),
    ])

    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleType: "ACCOUNT_TAX_CODE",
          supportCount: 5,
        }),
      ])
    )
  })

  test("generates an account cost-center check from a dominant pattern", () => {
    const rules = generateManualRules([
      line("a", { gl_account: "6500", cost_center: "AT-VIE-IT" }),
      line("b", { gl_account: "6500", cost_center: "AT-VIE-IT" }),
      line("c", { gl_account: "6500", cost_center: "AT-VIE-IT" }),
      line("d", { gl_account: "6500", cost_center: "AT-VIE-IT" }),
      line("e", { gl_account: "6500", cost_center: "AT-VIE-IT" }),
    ])

    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleType: "ACCOUNT_COST_CENTER",
          supportCount: 5,
        }),
      ])
    )
  })

  test("generates a recurring text account check", () => {
    const rules = generateManualRules([
      line("a", { booking_text: "HubSpot subscription March", gl_account: "6500" }),
      line("b", { booking_text: "HubSpot subscription April", gl_account: "6500" }),
      line("c", { booking_text: "HubSpot subscription May", gl_account: "6500" }),
    ])

    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleType: "TEXT_ACCOUNT",
          supportCount: 3,
        }),
      ])
    )
  })

  test("ignores weak patterns below support thresholds", () => {
    const rules = generateManualRules([
      line("a", { gl_account: "7600", tax_code: "V20" }),
      line("b", { gl_account: "7600", tax_code: "V20" }),
      line("c", { gl_account: "7600", tax_code: "V00" }),
    ])

    expect(
      rules.some((rule) => rule.ruleType === "ACCOUNT_TAX_CODE")
    ).toBe(false)
  })

  test("every suggestion includes criteria and evidence line ids", () => {
    const rules = generateManualRules([
      line("a", { gl_account: "7600", tax_code: "V20" }),
      line("b", { gl_account: "7600", tax_code: "V20" }),
      line("c", { gl_account: "7600", tax_code: "V20" }),
      line("d", { gl_account: "7600", tax_code: "V20" }),
      line("e", { gl_account: "7600", tax_code: "V20" }),
    ])

    expect(rules.length).toBeGreaterThan(0)
    expect(
      rules.every(
        (rule) => rule.criteria.length > 0 && rule.evidenceLineIds.length > 0
      )
    ).toBe(true)
  })

  test("limits result count to ten suggestions", () => {
    const lines = Array.from({ length: 14 }, (_, index) =>
      line(String(index), {
        gl_account: String(6000 + index),
        gl_account_name: `Account ${index}`,
        tax_code: "V20",
      })
    ).flatMap((baseLine) =>
      Array.from({ length: 5 }, (_, copyIndex) =>
        line(`${baseLine._id}-${copyIndex}`, {
          ...baseLine,
          _id: `${baseLine._id}-${copyIndex}`,
        })
      )
    )

    const rules = generateManualRules(lines, 20)

    expect(rules.length).toBeLessThanOrEqual(10)
  })
})
