import { v } from "convex/values"

import { generateManualRules } from "./analysis/bookingManual"
import { mutation, query } from "./_generated/server"

export const generate = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const runId = await ctx.db.insert("manualRuleRuns", {
      status: "running",
      startedAt: Date.now(),
    })

    try {
      const lines = await ctx.db
        .query("journalLines")
        .withIndex("by_posting_date")
        .collect()
      const suggestions = generateManualRules(lines, args.limit ?? 8)

      for (const suggestion of suggestions) {
        await ctx.db.insert("manualRuleSuggestions", {
          runId,
          ruleType: suggestion.ruleType,
          title: suggestion.title,
          recommendation: suggestion.recommendation,
          rationale: suggestion.rationale,
          confidence: suggestion.confidence,
          criteria: suggestion.criteria,
          supportCount: suggestion.supportCount,
          evidenceLineIds: suggestion.evidenceLineIds,
        })
      }

      await ctx.db.patch(runId, {
        status: "completed",
        completedAt: Date.now(),
        sourceLineCount: lines.length,
        suggestionCount: suggestions.length,
      })

      return {
        runId,
        suggestionCount: suggestions.length,
      }
    } catch (error) {
      await ctx.db.patch(runId, {
        status: "failed",
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : "Unknown generation error",
      })
      throw error
    }
  },
})

export const latest = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("manualRuleRuns")
      .withIndex("by_startedAt")
      .order("desc")
      .take(1)
    const run = runs[0]

    if (!run) {
      return null
    }

    const suggestions = await ctx.db
      .query("manualRuleSuggestions")
      .withIndex("by_runId_and_confidence", (q) => q.eq("runId", run._id))
      .order("desc")
      .collect()

    const suggestionsWithEvidence = []

    for (const suggestion of suggestions) {
      const evidence = await Promise.all(
        suggestion.evidenceLineIds.map((id) => ctx.db.get(id))
      )

      suggestionsWithEvidence.push({
        ...suggestion,
        evidence: evidence.filter((line) => line !== null),
      })
    }

    return {
      run,
      suggestions: suggestionsWithEvidence,
    }
  },
})
