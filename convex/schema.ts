import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  journalLines: defineTable({
    company_code: v.string(),
    posting_date: v.string(),
    document_id: v.string(),
    line_id: v.number(),
    gl_account: v.string(),
    gl_account_name: v.optional(v.string()),
    cost_center: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    debit_credit: v.union(v.literal("D"), v.literal("C")),
    booking_text: v.string(),
    vendor_id: v.optional(v.string()),
    customer_id: v.optional(v.string()),
    tax_code: v.optional(v.string()),
  })
    .index("by_document_id", ["document_id"])
    .index("by_posting_date", ["posting_date"])
    .index("by_gl_account", ["gl_account"])
    .index("by_vendor_id", ["vendor_id"])
    .index("by_customer_id", ["customer_id"])
    .searchIndex("by_booking_text", { searchField: "booking_text" }),
  anomalyRuns: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    sourceLineCount: v.optional(v.number()),
    findingCount: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_startedAt", ["startedAt"]),
  anomalyFindings: defineTable({
    runId: v.id("anomalyRuns"),
    type: v.union(
      v.literal("TYPO_LIKE_TEXT"),
      v.literal("UNUSUAL_TEXT_ACCOUNT_COMBO"),
      v.literal("UNUSUAL_TAX_CODE"),
      v.literal("UNUSUAL_COST_CENTER"),
      v.literal("AMOUNT_OUTLIER")
    ),
    title: v.string(),
    explanation: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    confidence: v.number(),
    criteria: v.array(v.string()),
    evidenceLineIds: v.array(v.id("journalLines")),
  })
    .index("by_runId", ["runId"])
    .index("by_runId_and_confidence", ["runId", "confidence"]),
})
