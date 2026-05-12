"use client"

import * as React from "react"
import type { VisibilityState } from "@tanstack/react-table"
import { useQuery } from "convex/react"

import { DataTable } from "@/components/data-table"
import { api } from "@/convex/_generated/api"
import {
  JOURNAL_TABLE_STATE_COOKIE,
  type JournalTableState,
  serializeJournalTableState,
} from "@/lib/journal-table-state"

function persistTableState(state: JournalTableState) {
  document.cookie = [
    `${JOURNAL_TABLE_STATE_COOKIE}=${serializeJournalTableState(state)}`,
    "Path=/",
    "Max-Age=31536000",
    "SameSite=Lax",
  ].join("; ")
}

export function JournalTable({
  initialTableState,
  titleId,
}: {
  initialTableState: JournalTableState
  titleId?: string
}) {
  const [tableState, setTableState] = React.useState(initialTableState)
  const { pageIndex, pageSize, search, costCenters, amountSort, dateSort } =
    tableState
  const deferredSearch = React.useDeferredValue(search)
  const deferredCostCenters = React.useDeferredValue(costCenters)
  const deferredAmountSort = React.useDeferredValue(amountSort)
  const deferredDateSort = React.useDeferredValue(dateSort)
  const isSearchPending =
    search !== deferredSearch ||
    costCenters !== deferredCostCenters ||
    amountSort !== deferredAmountSort ||
    dateSort !== deferredDateSort
  const costCentersArg =
    deferredCostCenters.length > 0 ? deferredCostCenters : undefined
  const availableCostCentersQuery = useQuery(
    api.journalLines.distinctCostCenters,
    {}
  )
  const availableCostCenters = React.useMemo(
    () => availableCostCentersQuery ?? [],
    [availableCostCentersQuery]
  )
  const lines = useQuery(
    api.journalLines.listAll,
    {
      search: deferredSearch,
      costCenters: costCentersArg,
    }
  )
  const isLoading = lines === undefined

  return (
    <DataTable
      data={lines ?? []}
      columnVisibility={tableState.columnVisibility}
      isLoading={isLoading}
      canLoadMore={false}
      isLoadingMore={false}
      pageIndex={pageIndex}
      pageSize={pageSize}
      search={search}
      deferredSearch={deferredSearch}
      isSearchPending={isSearchPending}
      costCenters={costCenters}
      availableCostCenters={availableCostCenters}
      onCostCentersChange={(values) => {
        setTableState((current) => {
          const next = {
            ...current,
            pageIndex: 0,
            costCenters: values,
          }

          persistTableState(next)
          return next
        })
      }}
      amountSort={deferredAmountSort}
      onAmountSortChange={(value) => {
        setTableState((current) => {
          const next = { ...current, pageIndex: 0, amountSort: value }

          persistTableState(next)
          return next
        })
      }}
      dateSort={deferredDateSort}
      onDateSortChange={(value) => {
        setTableState((current) => {
          const next = { ...current, pageIndex: 0, dateSort: value }

          persistTableState(next)
          return next
        })
      }}
      onColumnVisibilityChange={(visibility) => {
        setTableState((current) => {
          const nextVisibility =
            typeof visibility === "function"
              ? visibility(current.columnVisibility as VisibilityState)
              : visibility
          const next = {
            ...current,
            columnVisibility: nextVisibility,
          }

          persistTableState(next)
          return next
        })
      }}
      onLoadMore={() => {}}
      onPageIndexChange={(value) => {
        setTableState((current) => {
          const next = { ...current, pageIndex: value }

          persistTableState(next)
          return next
        })
      }}
      onPageSizeChange={(value) => {
        setTableState((current) => {
          const next = {
            ...current,
            pageIndex: 0,
            pageSize: value,
            pageSizeUserSet: true,
          }

          persistTableState(next)
          return next
        })
      }}
      onSearchChange={(value) => {
        setTableState((current) => {
          const next = {
            ...current,
            pageIndex: 0,
            search: value,
          }

          persistTableState(next)
          return next
        })
      }}
      titleId={titleId}
    />
  )
}
