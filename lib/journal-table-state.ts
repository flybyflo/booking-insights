export const DEFAULT_JOURNAL_TABLE_PAGE_SIZE = 15
export const JOURNAL_TABLE_STATE_COOKIE = "booking-insights-journal-table"

export type JournalTableState = {
  columnVisibility: Record<string, boolean>
  pageIndex: number
  pageSize: number
  pageSizeUserSet: boolean
  search: string
  costCenters: string[]
  amountSort: "asc" | "desc" | null
  dateSort: "asc" | "desc" | null
  totalRows?: number
}

export const defaultJournalTableState: JournalTableState = {
  columnVisibility: {},
  pageIndex: 0,
  pageSize: DEFAULT_JOURNAL_TABLE_PAGE_SIZE,
  pageSizeUserSet: false,
  search: "",
  costCenters: [],
  amountSort: null,
  dateSort: null,
}

export function parseJournalTableState(value: string | undefined) {
  if (!value) {
    return defaultJournalTableState
  }

  try {
    const parsed = JSON.parse(
      decodeURIComponent(value)
    ) as Partial<JournalTableState>
    const pageIndex =
      typeof parsed.pageIndex === "number" &&
      Number.isInteger(parsed.pageIndex) &&
      parsed.pageIndex >= 0
        ? parsed.pageIndex
        : defaultJournalTableState.pageIndex
    const pageSize =
      typeof parsed.pageSize === "number" &&
      Number.isFinite(parsed.pageSize) &&
      parsed.pageSize > 0
        ? parsed.pageSize
        : defaultJournalTableState.pageSize
    const columnVisibility =
      parsed.columnVisibility &&
      typeof parsed.columnVisibility === "object" &&
      !Array.isArray(parsed.columnVisibility)
        ? Object.fromEntries(
            Object.entries(parsed.columnVisibility).filter(
              (entry): entry is [string, boolean] =>
                typeof entry[0] === "string" && typeof entry[1] === "boolean"
            )
          )
        : defaultJournalTableState.columnVisibility

    const costCenters = Array.isArray(parsed.costCenters)
      ? parsed.costCenters.filter(
          (value): value is string => typeof value === "string"
        )
      : defaultJournalTableState.costCenters

    const amountSort: "asc" | "desc" | null =
      parsed.amountSort === "asc" || parsed.amountSort === "desc"
        ? parsed.amountSort
        : null
    const dateSort: "asc" | "desc" | null =
      parsed.dateSort === "asc" || parsed.dateSort === "desc"
        ? parsed.dateSort
        : null

    return {
      columnVisibility,
      pageIndex,
      pageSize,
      pageSizeUserSet: parsed.pageSizeUserSet === true,
      search: typeof parsed.search === "string" ? parsed.search : "",
      costCenters,
      amountSort,
      dateSort,
      totalRows:
        typeof parsed.totalRows === "number" &&
        Number.isFinite(parsed.totalRows) &&
        parsed.totalRows >= 0
          ? parsed.totalRows
          : undefined,
    }
  } catch {
    return defaultJournalTableState
  }
}

export function serializeJournalTableState(state: JournalTableState) {
  return encodeURIComponent(JSON.stringify(state))
}
