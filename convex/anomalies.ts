import { v } from "convex/values"

import { findAnomalies } from "./analysis/anomaly"
import { mutation, query } from "./_generated/server"

export const runScan = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const runId = await ctx.db.insert("anomalyRuns", {
      status: "running",
      startedAt: Date.now(),
    })

    try {
      const lines = await ctx.db
        .query("journalLines")
        .withIndex("by_posting_date")
        .collect()
      const findings = findAnomalies(lines, args.limit ?? 25)

      for (const finding of findings) {
        await ctx.db.insert("anomalyFindings", {
          runId,
          type: finding.type,
          title: finding.title,
          explanation: finding.explanation,
          severity: finding.severity,
          confidence: finding.confidence,
          criteria: finding.criteria,
          evidenceLineIds: finding.evidenceLineIds,
        })
      }

      await ctx.db.patch(runId, {
        status: "completed",
        completedAt: Date.now(),
        sourceLineCount: lines.length,
        findingCount: findings.length,
      })

      return {
        runId,
        findingCount: findings.length,
      }
    } catch (error) {
      await ctx.db.patch(runId, {
        status: "failed",
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : "Unknown scan error",
      })
      throw error
    }
  },
})

export const latest = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("anomalyRuns")
      .withIndex("by_startedAt")
      .order("desc")
      .take(1)
    const run = runs[0]

    if (!run) {
      return null
    }

    const findings = await ctx.db
      .query("anomalyFindings")
      .withIndex("by_runId_and_confidence", (q) => q.eq("runId", run._id))
      .order("desc")
      .collect()

    const findingsWithEvidence = []

    for (const finding of findings) {
      const evidence = await Promise.all(
        finding.evidenceLineIds.map((id) => ctx.db.get(id))
      )

      findingsWithEvidence.push({
        ...finding,
        evidence: evidence.filter((line) => line !== null),
      })
    }

    return {
      run,
      findings: findingsWithEvidence,
    }
  },
})
