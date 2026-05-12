"use client"

import * as React from "react"
import type { VisibilityState } from "@tanstack/react-table"
import { useQuery } from "convex/react"

import { LineTable } from "@/components/data-table"
import { api } from "@/convex/_generated/api"

const DEFAULT_PAGE_SIZE = 15

export function DocumentLineTable({
  documentId,
  titleId,
}: {
  documentId: string
  titleId?: string
}) {
  const [search, setSearch] = React.useState("")
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE)
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const deferredSearch = React.useDeferredValue(search)
  const lines = useQuery(api.journalLines.byDocument, {
    documentId,
    search: deferredSearch,
  })

  return (
    <LineTable
      data={lines ?? []}
      documentId={documentId}
      columnVisibility={columnVisibility}
      isLoading={lines === undefined}
      canLoadMore={false}
      isLoadingMore={false}
      pageIndex={pageIndex}
      pageSize={pageSize}
      search={search}
      deferredSearch={deferredSearch}
      isSearchPending={search !== deferredSearch}
      onColumnVisibilityChange={(visibility) => {
        setColumnVisibility((current) =>
          typeof visibility === "function" ? visibility(current) : visibility
        )
      }}
      onLoadMore={() => {}}
      onPageIndexChange={setPageIndex}
      onPageSizeChange={(value) => {
        setPageSize(value)
        setPageIndex(0)
      }}
      onSearchChange={(value) => {
        setSearch(value)
        setPageIndex(0)
      }}
      titleId={titleId}
    />
  )
}
