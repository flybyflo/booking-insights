"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconLayoutColumns,
  IconSearch,
  IconX,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/formatting"
import type { JournalDocument, JournalLine } from "@/lib/types"
import { cn } from "@/lib/utils"

type SortDirection = "asc" | "desc" | null

type FilterContext = {
  availableCostCenters: string[]
  selectedCostCenters: string[]
  onCostCentersChange: (values: string[]) => void
  amountSort: SortDirection
  onAmountSortChange: (value: SortDirection) => void
  dateSort: SortDirection
  onDateSortChange: (value: SortDirection) => void
}

const FilterContext = React.createContext<FilterContext | null>(null)
const EMPTY_COST_CENTERS: string[] = []
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100]

function SortableHeader({
  label,
  value,
  onChange,
  align = "start",
}: {
  label: string
  value: SortDirection
  onChange: ((value: SortDirection) => void) | undefined
  align?: "start" | "end"
}) {
  function cycle() {
    if (!onChange) {
      return
    }
    if (value === null) {
      onChange("desc")
    } else if (value === "desc") {
      onChange("asc")
    } else {
      onChange(null)
    }
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        "group/sortable-header inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/40",
        align === "start" ? "-ml-1" : "-mr-1 ml-auto",
        value !== null && "text-foreground"
      )}
      aria-label={`Sort by ${label.toLowerCase()}`}
    >
      <span>{label}</span>
      {value === "asc" ? (
        <IconArrowUp className="size-3.5" />
      ) : value === "desc" ? (
        <IconArrowDown className="size-3.5" />
      ) : (
        <IconArrowsSort className="size-3.5 text-muted-foreground opacity-60 transition-opacity group-hover/sortable-header:opacity-100" />
      )}
    </button>
  )
}

function DateHeader() {
  const ctx = React.useContext(FilterContext)
  return (
    <SortableHeader
      label="Date"
      value={ctx?.dateSort ?? null}
      onChange={ctx?.onDateSortChange}
      align="start"
    />
  )
}

function AmountHeader() {
  const ctx = React.useContext(FilterContext)
  return (
    <SortableHeader
      label="Amount"
      value={ctx?.amountSort ?? null}
      onChange={ctx?.onAmountSortChange}
      align="end"
    />
  )
}

function CostCenterFilter() {
  const ctx = React.useContext(FilterContext)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const availableCostCenters = ctx?.availableCostCenters ?? EMPTY_COST_CENTERS
  const selectedCostCenters = ctx?.selectedCostCenters ?? EMPTY_COST_CENTERS
  const onCostCentersChange = ctx?.onCostCentersChange
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return availableCostCenters
    }
    return availableCostCenters.filter((value) =>
      value.toLowerCase().includes(q)
    )
  }, [availableCostCenters, query])
  const hasSelection = selectedCostCenters.length > 0

  if (!ctx || !onCostCentersChange) {
    return <>Cost center</>
  }
  const updateCostCenters = onCostCentersChange

  function toggle(value: string) {
    if (selectedCostCenters.includes(value)) {
      updateCostCenters(selectedCostCenters.filter((v) => v !== value))
    } else {
      updateCostCenters([...selectedCostCenters, value])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group/cost-center-filter -ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/40",
            hasSelection && "text-foreground"
          )}
          aria-label="Filter by cost center"
        >
          <span>Cost center</span>
          {hasSelection ? (
            <Badge
              variant="secondary"
              className="h-4 rounded-full px-1.5 font-mono text-[10px] leading-none"
            >
              {selectedCostCenters.length}
            </Badge>
          ) : (
            <IconFilter className="size-3.5 text-muted-foreground opacity-60 transition-opacity group-hover/cost-center-filter:opacity-100" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cost centers"
            className="h-8 w-full pl-8 text-sm"
            autoFocus
          />
        </div>
        <div className="mt-2 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              No cost centers match
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((value) => {
                const checked = selectedCostCenters.includes(value)
                return (
                  <li key={value}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                        checked ? "bg-foreground/10" : "hover:bg-foreground/5"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(value)}
                      />
                      <span className="font-mono text-xs">{value}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {hasSelection ? (
          <div className="mt-2 flex items-center justify-between border-t border-foreground/10 pt-2">
            <span className="text-xs text-muted-foreground">
              {selectedCostCenters.length} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onCostCentersChange([])}
            >
              <IconX className="size-3" />
              Clear
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function ShimmerCell({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "shimmer-skeleton h-4 max-w-full rounded-sm bg-muted",
        className
      )}
    />
  )
}

function SkeletonTableCell({ columnId }: { columnId: string }) {
  if (columnId === "amount" || columnId === "gross_amount") {
    return (
      <div className="flex justify-end">
        <ShimmerCell className="h-3.5 w-24" />
      </div>
    )
  }

  if (columnId === "cost_center" || columnId === "cost_centers") {
    return (
      <div className="inline-flex h-5 items-center rounded-3xl border px-2">
        <ShimmerCell className="h-3 w-16" />
      </div>
    )
  }

  const widths: Record<string, string> = {
    accounts: "w-28",
    booking_text: "w-full",
    document_id: "w-20",
    line_count: "w-8",
    partner: "w-20",
    posting_date: "w-20",
    status: "w-16",
  }

  return <ShimmerCell className={cn("h-3.5", widths[columnId] ?? "w-16")} />
}

function buildJournalDocuments(lines: JournalLine[]): JournalDocument[] {
  const documents = new Map<string, JournalLine[]>()

  for (const line of lines) {
    const current = documents.get(line.document_id) ?? []
    current.push(line)
    documents.set(line.document_id, current)
  }

  return Array.from(documents.entries())
    .map(([documentId, documentLines]) => {
      const sortedLines = [...documentLines].sort((a, b) => a.line_id - b.line_id)
      const primaryLine =
        sortedLines.find((line) => line.debit_credit === "D") ?? sortedLines[0]
      const partner =
        sortedLines.find((line) => line.vendor_id || line.customer_id)
          ?.vendor_id ??
        sortedLines.find((line) => line.vendor_id || line.customer_id)
          ?.customer_id ??
        "-"
      const values = (items: Array<string | undefined>) =>
        Array.from(new Set(items.filter((item): item is string => Boolean(item))))

      return {
        document_id: documentId,
        posting_date: sortedLines[0]?.posting_date ?? "",
        booking_text: primaryLine?.booking_text ?? "",
        partner,
        cost_centers: values(sortedLines.map((line) => line.cost_center)),
        accounts: values(sortedLines.map((line) => line.gl_account)),
        tax_codes: values(sortedLines.map((line) => line.tax_code)),
        currency: sortedLines[0]?.currency ?? "EUR",
        line_count: sortedLines.length,
        gross_amount: sortedLines
          .filter((line) => line.debit_credit === "D")
          .reduce((sum, line) => sum + Math.abs(line.amount), 0),
        balance: sortedLines.reduce((sum, line) => sum + line.amount, 0),
        lines: sortedLines,
      }
    })
    .sort((a, b) =>
      a.posting_date === b.posting_date
        ? a.document_id.localeCompare(b.document_id)
        : a.posting_date.localeCompare(b.posting_date)
    )
}

const documentColumnLabels: Record<string, string> = {
  accounts: "Accounts",
  booking_text: "Booking text",
  cost_centers: "Cost centers",
  document_id: "Document",
  gross_amount: "Gross amount",
  line_count: "Lines",
  partner: "Partner",
  posting_date: "Date",
  tax_codes: "Tax",
}

const documentColumns: ColumnDef<JournalDocument>[] = [
  {
    accessorKey: "posting_date",
    header: () => <DateHeader />,
    size: 120,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.posting_date}</span>
    ),
  },
  {
    accessorKey: "document_id",
    header: "Document",
    size: 120,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.document_id}</span>
    ),
  },
  {
    accessorKey: "booking_text",
    header: "Booking text",
    size: 280,
    cell: ({ row }) => (
      <span className="block truncate">{row.original.booking_text}</span>
    ),
  },
  {
    accessorKey: "partner",
    header: "Partner",
    size: 110,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.partner}</span>
    ),
  },
  {
    accessorKey: "accounts",
    header: "Accounts",
    size: 170,
    cell: ({ row }) => (
      <span className="block truncate font-mono text-xs">
        {row.original.accounts.join(" / ")}
      </span>
    ),
  },
  {
    accessorKey: "cost_centers",
    header: () => <CostCenterFilter />,
    size: 150,
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-wrap gap-1">
        {row.original.cost_centers.slice(0, 2).map((costCenter) => (
          <Badge
            key={costCenter}
            variant="outline"
            className="font-mono text-xs"
          >
            {costCenter}
          </Badge>
        ))}
        {row.original.cost_centers.length > 2 ? (
          <Badge variant="secondary" className="text-xs">
            +{row.original.cost_centers.length - 2}
          </Badge>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "gross_amount",
    header: () => (
      <div className="flex justify-end">
        <AmountHeader />
      </div>
    ),
    size: 130,
    cell: ({ row }) => (
      <div className="text-right font-mono text-xs">
        {formatCurrency(row.original.gross_amount, row.original.currency)}
      </div>
    ),
  },
  {
    accessorKey: "line_count",
    header: () => <div className="text-right">Lines</div>,
    size: 70,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.line_count}</div>
    ),
  },
  {
    accessorKey: "tax_codes",
    header: "Tax",
    size: 80,
    cell: ({ row }) => row.original.tax_codes.join(", ") || "-",
  },
]

const lineColumnLabels: Record<string, string> = {
  amount: "Amount",
  booking_text: "Booking text",
  cost_center: "Cost center",
  debit_credit: "D/C",
  gl_account: "G/L account",
  line_id: "Line",
  partner: "Partner",
  tax_code: "Tax",
}

const lineColumns: ColumnDef<JournalLine>[] = [
  {
    accessorKey: "line_id",
    header: "Line",
    size: 70,
    cell: ({ row }) => row.original.line_id,
  },
  {
    accessorKey: "gl_account",
    header: "G/L account",
    size: 180,
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-mono text-xs">{row.original.gl_account}</div>
        <div className="truncate text-xs text-muted-foreground">
          {row.original.gl_account_name}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "cost_center",
    header: "Cost center",
    size: 140,
    cell: ({ row }) =>
      row.original.cost_center ? (
        <Badge variant="outline" className="font-mono text-xs">
          {row.original.cost_center}
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    size: 130,
    cell: ({ row }) => (
      <div className="text-right font-mono text-xs">
        {formatCurrency(row.original.amount, row.original.currency)}
      </div>
    ),
  },
  {
    accessorKey: "debit_credit",
    header: "D/C",
    size: 70,
    cell: ({ row }) => (
      <Badge
        variant={row.original.debit_credit === "D" ? "default" : "secondary"}
      >
        {row.original.debit_credit}
      </Badge>
    ),
  },
  {
    accessorKey: "tax_code",
    header: "Tax",
    size: 80,
    cell: ({ row }) => row.original.tax_code ?? "-",
  },
  {
    id: "partner",
    header: "Partner",
    size: 110,
    accessorFn: (row) => row.vendor_id ?? row.customer_id ?? "",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.vendor_id ?? row.original.customer_id ?? "-"}
      </span>
    ),
  },
  {
    accessorKey: "booking_text",
    header: "Booking text",
    size: 320,
    cell: ({ row }) => (
      <span className="block truncate">{row.original.booking_text}</span>
    ),
  },
]

type BaseDataTableProps<TData> = {
  columnLabels: Record<string, string>
  columns: ColumnDef<TData>[]
  data: TData[]
  itemLabel: string
  minWidth: number
  getRowId?: (row: TData) => string
  onRowClick?: (row: TData) => void
  canLoadMore: boolean
  columnVisibility: VisibilityState
  isLoading?: boolean
  isLoadingMore?: boolean
  pageIndex: number
  pageSize: number
  search: string
  deferredSearch?: string
  isSearchPending?: boolean
  totalRows?: number
  onColumnVisibilityChange: (
    visibility:
      | VisibilityState
      | ((current: VisibilityState) => VisibilityState)
  ) => void
  onLoadMore: (numItems: number) => void
  onPageIndexChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchChange: (value: string) => void
  subtitle: string
  title: string
  titleId?: string
}

function BaseDataTable<TData>({
  columnLabels,
  columns,
  data,
  itemLabel,
  minWidth,
  getRowId,
  onRowClick,
  canLoadMore,
  columnVisibility,
  isLoading = false,
  isLoadingMore = false,
  pageIndex,
  pageSize,
  search,
  deferredSearch,
  isSearchPending = false,
  totalRows,
  onColumnVisibilityChange,
  onLoadMore,
  onPageIndexChange,
  onPageSizeChange,
  onSearchChange,
  subtitle,
  title,
  titleId,
}: BaseDataTableProps<TData>) {
  const [isMounted, setIsMounted] = React.useState(false)
  const pendingPageIndexRef = React.useRef<number | null>(null)

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
    },
    getRowId,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
  })
  const rows = table.getRowModel().rows
  const pageStart = pageIndex * pageSize
  const pageEnd = pageStart + pageSize
  const pageRows = rows.slice(pageStart, pageEnd)
  const emptyRowCount = Math.max(0, pageSize - pageRows.length)
  const pageCount =
    totalRows === undefined
      ? Math.max(1, Math.ceil(data.length / pageSize))
      : Math.max(1, Math.ceil(totalRows / pageSize))
  const nextPageStart = (pageIndex + 1) * pageSize
  const hasLoadedNextPage = nextPageStart < data.length
  const canPreviousPage = pageIndex > 0
  const canNextPage =
    pageIndex + 1 < pageCount && (hasLoadedNextPage || canLoadMore)
  const getRequiredRows = React.useCallback(
    (targetPageIndex: number) => {
      const fullPageRows = (targetPageIndex + 1) * pageSize

      return totalRows === undefined
        ? fullPageRows
        : Math.min(fullPageRows, totalRows)
    },
    [pageSize, totalRows]
  )

  function goToPage(nextPageIndex: number) {
    const boundedPageIndex = Math.max(0, Math.min(nextPageIndex, pageCount - 1))
    const requiredRows = getRequiredRows(boundedPageIndex)

    if (requiredRows <= data.length) {
      onPageIndexChange(boundedPageIndex)
      return
    }

    if (canLoadMore) {
      pendingPageIndexRef.current = boundedPageIndex
      onLoadMore(requiredRows - data.length)
    }
  }

  function goToNextPage() {
    if (!canNextPage) {
      return
    }

    const nextPageIndex = pageIndex + 1
    const requiredRows = getRequiredRows(nextPageIndex)

    if (requiredRows <= data.length) {
      onPageIndexChange(nextPageIndex)
      return
    }

    if (canLoadMore) {
      pendingPageIndexRef.current = nextPageIndex
      onLoadMore(requiredRows - data.length)
    }
  }

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    const pendingPageIndex = pendingPageIndexRef.current

    if (pendingPageIndex === null) {
      return
    }

    const requiredRows = getRequiredRows(pendingPageIndex)

    if (requiredRows <= data.length) {
      pendingPageIndexRef.current = null
      onPageIndexChange(pendingPageIndex)
    }
  }, [data.length, getRequiredRows, onPageIndexChange])

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div>
          <h2 id={titleId} className="text-base font-medium">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label="Search"
              placeholder="Search"
              className="h-8 w-64 pl-8"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                Columns
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {columnLabels[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mx-4 overflow-x-auto rounded-md border bg-background lg:mx-6">
        <Table style={{ minWidth }} className="table-fixed">
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            className={cn(
              "transition-[opacity,filter,transform] duration-300 ease-out will-change-[opacity,transform,filter] motion-reduce:transition-none",
              isSearchPending
                ? "scale-[0.998] opacity-40 blur-[1.5px]"
                : "blur-0 scale-100 opacity-100"
            )}
          >
            {isLoading && pageRows.length === 0 ? (
              Array.from({ length: pageSize }).map((_, rowIndex) => (
                <TableRow
                  key={`loading-${rowIndex}`}
                  aria-hidden="true"
                  className="h-[53px]"
                >
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id} className="h-[53px] py-0">
                      <SkeletonTableCell columnId={column.id} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <>
                {pageRows.map((row, rowIndex) => (
                  <React.Fragment
                    key={`${deferredSearch ?? ""}-${pageIndex}-${row.id}`}
                  >
                    <TableRow
                      className={cn(
                        "h-[53px] animate-in duration-300 ease-out fade-in-0 fill-mode-both slide-in-from-bottom-1 motion-reduce:animate-none",
                        onRowClick && "cursor-pointer"
                      )}
                      style={{
                        animationDelay: `${Math.min(rowIndex, 12) * 18}ms`,
                      }}
                      tabIndex={onRowClick ? 0 : undefined}
                      onClick={() => onRowClick?.(row.original)}
                      onKeyDown={(event) => {
                        if (!onRowClick) {
                          return
                        }
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          onRowClick(row.original)
                        }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="h-[53px] py-0">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </React.Fragment>
                ))}
                {emptyRowCount > 0
                  ? Array.from({ length: emptyRowCount }).map((_, rowIndex) => (
                      <TableRow
                        key={`empty-${rowIndex}`}
                        aria-hidden="true"
                        className="h-[53px] hover:bg-transparent"
                      >
                        {table.getVisibleLeafColumns().map((column) => (
                          <TableCell key={column.id} className="h-[53px] py-0">
                            &nbsp;
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : null}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="text-sm text-muted-foreground">
          {totalRows === undefined ? data.length : totalRows} {itemLabel}
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {Array.from(new Set([pageSize, ...PAGE_SIZE_OPTIONS]))
                  .sort((a, b) => a - b)
                  .map((option) => (
                    <SelectItem key={option} value={`${option}`}>
                      {option}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm font-medium">
            Page {pageIndex + 1} of {pageCount}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => goToPage(pageIndex - 1)}
              disabled={isMounted ? !canPreviousPage : undefined}
              aria-label="Previous page"
            >
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={goToNextPage}
              disabled={isMounted ? !canNextPage || isLoadingMore : undefined}
              aria-label="Next page"
            >
              <IconChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function DataTable({
  data,
  availableCostCenters,
  costCenters,
  onCostCentersChange,
  amountSort = null,
  onAmountSortChange,
  dateSort = null,
  onDateSortChange,
  ...props
}: Omit<
  BaseDataTableProps<JournalDocument>,
  | "columnLabels"
  | "columns"
  | "data"
  | "getRowId"
  | "itemLabel"
  | "minWidth"
  | "onRowClick"
  | "subtitle"
  | "title"
> & {
  data: JournalLine[]
  availableCostCenters: string[]
  costCenters: string[]
  onCostCentersChange: (values: string[]) => void
  amountSort?: SortDirection
  onAmountSortChange?: (value: SortDirection) => void
  dateSort?: SortDirection
  onDateSortChange?: (value: SortDirection) => void
}) {
  const router = useRouter()
  const documents = React.useMemo(() => {
    const grouped = buildJournalDocuments(data)
    if (!amountSort && !dateSort) {
      return grouped
    }
    const sortable = [...grouped]
    sortable.sort((a, b) => {
      if (dateSort) {
        const cmp = a.posting_date.localeCompare(b.posting_date)
        if (cmp !== 0) {
          return dateSort === "asc" ? cmp : -cmp
        }
      }
      if (amountSort) {
        const cmp = a.gross_amount - b.gross_amount
        if (cmp !== 0) {
          return amountSort === "asc" ? cmp : -cmp
        }
      }
      return a.document_id.localeCompare(b.document_id)
    })
    return sortable
  }, [data, amountSort, dateSort])

  const noopSort = React.useCallback(() => {}, [])
  const filterContextValue = React.useMemo<FilterContext>(
    () => ({
      availableCostCenters,
      selectedCostCenters: costCenters,
      onCostCentersChange,
      amountSort,
      onAmountSortChange: onAmountSortChange ?? noopSort,
      dateSort,
      onDateSortChange: onDateSortChange ?? noopSort,
    }),
    [
      availableCostCenters,
      costCenters,
      onCostCentersChange,
      amountSort,
      onAmountSortChange,
      dateSort,
      onDateSortChange,
      noopSort,
    ]
  )

  return (
    <FilterContext.Provider value={filterContextValue}>
      <BaseDataTable
        {...props}
        data={documents}
        totalRows={documents.length}
        columnLabels={documentColumnLabels}
        columns={documentColumns}
        getRowId={(row) => row.document_id}
        itemLabel="documents"
        minWidth={1200}
        onRowClick={(row) => router.push(`/documents/${row.document_id}`)}
        subtitle="Review balanced booking documents, then open a document to inspect its journal lines."
        title="Ledger review"
      />
    </FilterContext.Provider>
  )
}

export function LineTable({
  data,
  documentId,
  ...props
}: Omit<
  BaseDataTableProps<JournalLine>,
  | "columnLabels"
  | "columns"
  | "data"
  | "getRowId"
  | "itemLabel"
  | "minWidth"
  | "subtitle"
  | "title"
> & {
  data: JournalLine[]
  documentId: string
}) {
  return (
    <BaseDataTable
      {...props}
      data={data}
      columnLabels={lineColumnLabels}
      columns={lineColumns}
      getRowId={(row) => `${row.document_id}-${row.line_id}`}
      itemLabel="lines"
      minWidth={1100}
      subtitle="Inspect the journal lines, accounts, tax code, partner, and balancing amounts for this document."
      title={`Document ${documentId}`}
    />
  )
}
