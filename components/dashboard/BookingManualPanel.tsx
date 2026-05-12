"use client"

import * as React from "react"
import { IconBook, IconPlayerPlay } from "@tabler/icons-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { EvidenceLines } from "@/components/dashboard/EvidenceLines"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

const ruleTypeLabels = {
  ACCOUNT_TAX_CODE: "Account + tax",
  ACCOUNT_COST_CENTER: "Account + cost center",
  TEXT_ACCOUNT: "Text + account",
  PARTNER_ACCOUNT: "Partner + account",
  DOCUMENT_STRUCTURE: "Document structure",
} as const

function formatTimestamp(value: number | undefined) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

export function BookingManualPanel() {
  const latest = useQuery(api.bookingManual.latest)
  const generate = useMutation(api.bookingManual.generate)
  const [isRunning, setIsRunning] = React.useState(false)

  async function handleGenerate() {
    setIsRunning(true)

    try {
      const result = await generate({ limit: 8 })
      toast.success(
        `Booking manual generated with ${result.suggestionCount} checks.`
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Booking manual generation failed."
      )
    } finally {
      setIsRunning(false)
    }
  }

  const run = latest?.run
  const suggestions = latest?.suggestions ?? []
  const isInitialLoading = latest === undefined

  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="max-w-3xl text-sm text-muted-foreground">
            Deterministic rule suggestions from recurring account, tax code,
            cost center, partner, text, and document-structure patterns.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isRunning}
          className="w-full gap-2 sm:w-fit"
        >
          <IconPlayerPlay className="size-4" />
          {isRunning ? "Generating..." : "Generate booking manual"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Status" value={run?.status ?? "No run"} />
        <Metric label="Checks" value={run?.suggestionCount ?? 0} />
        <Metric label="Lines scanned" value={run?.sourceLineCount ?? "-"} />
        <Metric label="Completed" value={formatTimestamp(run?.completedAt)} />
      </div>

      {isInitialLoading ? (
        <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
          Loading latest manual...
        </div>
      ) : !run ? (
        <EmptyState />
      ) : run.status === "failed" ? (
        <div className="rounded-md border border-destructive/30 p-4 text-sm">
          <div className="font-medium text-destructive">Generation failed</div>
          <div className="mt-1 text-muted-foreground">
            {run.error ?? "No error message was recorded."}
          </div>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
          No booking manual checks were generated.
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <section
              key={suggestion._id}
              className="overflow-hidden rounded-md border border-border"
            >
              <div className="space-y-3 border-b border-border bg-muted/25 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <IconBook className="size-4 text-muted-foreground" />
                      <h2 className="font-medium">{suggestion.title}</h2>
                      <Badge variant="secondary">
                        {
                          ruleTypeLabels[
                            suggestion.ruleType as keyof typeof ruleTypeLabels
                          ]
                        }
                      </Badge>
                    </div>
                    <p className="text-sm">{suggestion.recommendation}</p>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.rationale}
                    </p>
                  </div>
                  <div className="space-y-1 text-right font-mono text-sm tabular-nums">
                    <div>{suggestion.confidence}% confidence</div>
                    <div className="text-xs text-muted-foreground">
                      {suggestion.supportCount} supporting lines
                    </div>
                  </div>
                </div>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {suggestion.criteria.map((criterion) => (
                    <li
                      key={criterion}
                      className="rounded-sm border border-border bg-background px-2.5 py-1 text-sm leading-relaxed"
                    >
                      {criterion}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-x-auto p-2">
                <EvidenceLines lines={suggestion.evidence} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 truncate text-sm font-medium",
          typeof value === "number" && "font-mono tabular-nums"
        )}
      >
        {value}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-md border border-border p-6">
      <div className="font-medium">No manual generated yet</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate the booking manual to persist checks and supporting examples.
      </p>
    </div>
  )
}
