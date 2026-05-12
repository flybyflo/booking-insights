import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "./_generated/server"

function lineMatchesSearch(
  line: {
    company_code: string
    posting_date: string
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
  },
  search: string
) {
  const values = [
    line.company_code,
    line.posting_date,
    line.document_id,
    String(line.line_id),
    line.gl_account,
    line.gl_account_name,
    line.cost_center,
    String(line.amount),
    line.currency,
    line.debit_credit,
    line.booking_text,
    line.vendor_id,
    line.customer_id,
    line.tax_code,
  ]

  return values.some((value) => value?.toLowerCase().includes(search))
}

function matchesCostCenters(
  line: { cost_center?: string },
  costCenters: string[] | undefined
) {
  if (!costCenters || costCenters.length === 0) {
    return true
  }
  return line.cost_center ? costCenters.includes(line.cost_center) : false
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    costCenters: v.optional(v.array(v.string())),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const search = args.search?.trim().toLowerCase()
    const costCenters = args.costCenters
    const hasFilters =
      Boolean(search) || (costCenters && costCenters.length > 0)

    if (hasFilters) {
      const rows = await ctx.db
        .query("journalLines")
        .withIndex("by_posting_date")
        .collect()
      const filteredRows = rows.filter(
        (line) =>
          matchesCostCenters(line, costCenters) &&
          (!search || lineMatchesSearch(line, search))
      )
      const cursor = args.paginationOpts.cursor
        ? Number(args.paginationOpts.cursor)
        : 0
      const page = filteredRows.slice(
        cursor,
        cursor + args.paginationOpts.numItems
      )
      const nextCursor = cursor + page.length

      return {
        page,
        isDone: nextCursor >= filteredRows.length,
        continueCursor: String(nextCursor),
      }
    }

    return await ctx.db
      .query("journalLines")
      .withIndex("by_posting_date")
      .paginate(args.paginationOpts)
  },
})

export const listAll = query({
  args: {
    search: v.optional(v.string()),
    costCenters: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const search = args.search?.trim().toLowerCase()
    const costCenters = args.costCenters
    const hasFilters = Boolean(search) || (costCenters && costCenters.length > 0)
    const rows = await ctx.db
      .query("journalLines")
      .withIndex("by_posting_date")
      .collect()

    if (!hasFilters) {
      return rows
    }

    return rows.filter(
      (line) =>
        matchesCostCenters(line, costCenters) &&
        (!search || lineMatchesSearch(line, search))
    )
  },
})

export const byDocument = query({
  args: {
    documentId: v.string(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const search = args.search?.trim().toLowerCase()
    const rows = await ctx.db
      .query("journalLines")
      .withIndex("by_document_id", (q) => q.eq("document_id", args.documentId))
      .collect()
    const sortedRows = rows.sort((a, b) => a.line_id - b.line_id)

    if (!search) {
      return sortedRows
    }

    return sortedRows.filter((line) => lineMatchesSearch(line, search))
  },
})

export const count = query({
  args: {
    search: v.optional(v.string()),
    costCenters: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const search = args.search?.trim().toLowerCase()
    const costCenters = args.costCenters
    const hasFilters = Boolean(search) || (costCenters && costCenters.length > 0)
    let total = 0

    if (hasFilters) {
      const rows = await ctx.db
        .query("journalLines")
        .withIndex("by_posting_date")
        .collect()

      return rows.filter(
        (line) =>
          matchesCostCenters(line, costCenters) &&
          (!search || lineMatchesSearch(line, search))
      ).length
    }

    for await (const line of ctx.db
      .query("journalLines")
      .withIndex("by_posting_date")) {
      total += line._id ? 1 : 0
    }

    return total
  },
})

export const distinctCostCenters = query({
  args: {},
  handler: async (ctx) => {
    const values = new Set<string>()

    for await (const line of ctx.db
      .query("journalLines")
      .withIndex("by_posting_date")) {
      if (line.cost_center) {
        values.add(line.cost_center)
      }
    }

    return Array.from(values).sort()
  },
})
