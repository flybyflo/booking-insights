"use client"

import * as React from "react"
import { IconAlertTriangle, IconPlayerPlay } from "@tabler/icons-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { EvidenceLines } from "@/components/dashboard/EvidenceLines"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

const severityVariant = {
  high: "default",
  medium: "secondary",
  low: "outline",
} as const

const findingTypeLabels = {
  TYPO_LIKE_TEXT: "Typo-like text",
  UNUSUAL_TEXT_ACCOUNT_COMBO: "Unusual account usage",
  UNUSUAL_TAX_CODE: "Unusual tax code",
  UNUSUAL_COST_CENTER: "Unusual cost center",
  AMOUNT_OUTLIER: "Amount outlier",
} as const

function formatTimestamp(value: number | undefined) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

export function AnomalyScanPanel() {
  const latest = useQuery(api.anomalies.latest)
  const runScan = useMutation(api.anomalies.runScan)
  const [isRunning, setIsRunning] = React.useState(false)

  async function handleRunScan() {
    setIsRunning(true)

    try {
      const result = await runScan({ limit: 25 })
      toast.success(
        `Anomaly scan completed with ${result.findingCount} findings.`
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Anomaly scan failed."
      )
    } finally {
      setIsRunning(false)
    }
  }

  const run = latest?.run
  const findings = latest?.findings ?? []
  const findingTypes = Array.from(
    new Set(
      findings.map(
        (finding) =>
          findingTypeLabels[finding.type as keyof typeof findingTypeLabels]
      )
    )
  )
  const isInitialLoading = latest === undefined

  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Anomalies</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Server-side anomaly scan over ledger lines with persisted findings
            and evidence rows.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleRunScan}
          disabled={isRunning}
          className="w-full gap-2 sm:w-fit"
        >
          <IconPlayerPlay className="size-4" />
          {isRunning ? "Running scan..." : "Run anomaly scan"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Status" value={run?.status ?? "No scan"} />
        <Metric label="Findings" value={run?.findingCount ?? 0} />
        <Metric label="Lines scanned" value={run?.sourceLineCount ?? "-"} />
        <Metric label="Completed" value={formatTimestamp(run?.completedAt)} />
      </div>

      {run && findingTypes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {findingTypes.map((type) => (
            <Badge key={type} variant="outline" className="font-normal">
              {type}
            </Badge>
          ))}
        </div>
      ) : null}

      {isInitialLoading ? (
        <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
          Loading latest scan...
        </div>
      ) : !run ? (
        <EmptyState />
      ) : run.status === "failed" ? (
        <div className="rounded-md border border-destructive/30 p-4 text-sm">
          <div className="font-medium text-destructive">Scan failed</div>
          <div className="mt-1 text-muted-foreground">
            {run.error ?? "No error message was recorded."}
          </div>
        </div>
      ) : findings.length === 0 ? (
        <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
          No anomaly findings in the latest scan.
        </div>
      ) : (
        <div className="space-y-4">
          {findings.map((finding) => (
            <section
              key={finding._id}
              className="overflow-hidden rounded-md border border-border"
            >
              <div className="space-y-3 border-b border-border bg-muted/25 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <IconAlertTriangle className="size-4 text-muted-foreground" />
                      <h2 className="font-medium">{finding.title}</h2>
                      <Badge
                        variant={severityVariant[finding.severity]}
                        className="capitalize"
                      >
                        {finding.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {finding.explanation}
                    </p>
                  </div>
                  <div className="font-mono text-sm tabular-nums">
                    {finding.confidence}% confidence
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {finding.criteria.map((criterion) => (
                    <Badge
                      key={criterion}
                      variant="outline"
                      className="font-normal"
                    >
                      {criterion}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto p-2">
                <EvidenceLines lines={finding.evidence} />
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
      <div className="font-medium">No scan yet</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Run the anomaly scan to persist findings and evidence lines.
      </p>
    </div>
  )
}
