import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    type RowSelectionState,
    useReactTable,
} from "@tanstack/react-table"
import { Search } from "lucide-react"
import * as React from "react"
import { useRef, useState } from "react"
import { getModifierKey, isModifierKeyPressed } from "@/shared/lib/keyboard"
import { Input } from "@/shared/ui/input"
import { Kbd } from "@/shared/ui/kbd"
import { PageSizeSelector } from "@/shared/ui/page-size-selector"
import { Pagination } from "@/shared/ui/pagination"
import { Spinner } from "@/shared/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table"
import { TableSkeleton, type TableSkeletonConfig } from "@/shared/ui/table-skeleton"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    searchPlaceholder?: string
    filters?: React.ReactNode
    searchValue?: string
    onSearchChange?: (value: string) => void
    isLoading?: boolean
    hideSearch?: boolean
    customHeader?: React.ReactNode
    emptyState?: React.ReactNode
    skeletonConfig?: TableSkeletonConfig
    useSkeleton?: boolean
    paginationInfo?: {
        currentPage: number
        totalPages: number
        total: number
        limit: number
    }
    onPageChange?: (page: number) => void
    pageSize?: number
    onPageSizeChange?: (pageSize: number) => void
    hidePagination?: boolean
    showPageInfo?: boolean
    pageInfoLabel?: string
    isPlaceholderData?: boolean
    isFetching?: boolean
    rowSelection?: RowSelectionState
    onRowSelectionChange?: (rowSelection: RowSelectionState) => void
    enableRowSelection?: boolean
    onRowClick?: (row: TData) => void
}

// FIXME: refactor pending
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cognitive complexity refactor pending
export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey = "name",
    searchPlaceholder = "Filter...",
    filters,
    searchValue,
    onSearchChange,
    isLoading = false,
    hideSearch = false,
    customHeader,
    emptyState,
    skeletonConfig,
    useSkeleton = true,
    paginationInfo,
    onPageChange,
    pageSize,
    onPageSizeChange,
    hidePagination = false,
    showPageInfo = false,
    pageInfoLabel,
    isPlaceholderData,
    isFetching,
    rowSelection,
    onRowSelectionChange,
    enableRowSelection = false,
    onRowClick,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([])
    const [columnFilters, setColumnFilters] = React.useState<{ id: string; value: unknown }[]>([])
    const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({})
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [modifierKey, setModifierKey] = useState<string>("⌘")

    React.useEffect(() => {
        setModifierKey(getModifierKey())
    }, [])

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: onRowSelectionChange
            ? (updater) => {
                  const next = typeof updater === "function" ? updater(rowSelection ?? {}) : updater
                  onRowSelectionChange(next)
              }
            : undefined,
        enableRowSelection: enableRowSelection,
        getRowId: (row: TData) => (row as Record<string, unknown>).id as string,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            ...(enableRowSelection && rowSelection ? { rowSelection } : {}),
        },
        manualPagination: true,
    })

    const currentSearchValue =
        searchValue !== undefined || hideSearch
            ? (searchValue ?? "")
            : ((table.getColumn(searchKey)?.getFilterValue() as string) ?? "")

    React.useEffect(() => {
        const inputElement = searchInputRef.current
        if (!inputElement || !currentSearchValue) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault()
                event.stopPropagation()
                if (onSearchChange) {
                    onSearchChange("")
                } else {
                    table.getColumn(searchKey)?.setFilterValue("")
                }
            }
        }

        inputElement.addEventListener("keydown", onKeyDown)
        return () => {
            inputElement.removeEventListener("keydown", onKeyDown)
        }
    }, [currentSearchValue, onSearchChange, searchKey, table])

    React.useEffect(() => {
        if (hideSearch) return

        const onGlobalKeyDown = (event: KeyboardEvent) => {
            if (isModifierKeyPressed(event) && event.key.toLowerCase() === "k") {
                event.preventDefault()
                searchInputRef.current?.focus()
            }
        }

        document.addEventListener("keydown", onGlobalKeyDown)
        return () => {
            document.removeEventListener("keydown", onGlobalKeyDown)
        }
    }, [hideSearch])

    return (
        <div className="w-full space-y-3">
            {(customHeader || !hideSearch || filters) && (
                <div className="flex flex-wrap items-center gap-2">
                    {customHeader && <div className="flex items-center">{customHeader}</div>}
                    {!hideSearch && (
                        <div className="relative w-fit max-w-3xs">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-ds-fg-muted" />
                            <Input
                                ref={searchInputRef}
                                size={"sm"}
                                placeholder={searchPlaceholder}
                                value={
                                    searchValue !== undefined
                                        ? searchValue
                                        : ((table
                                              .getColumn(searchKey)
                                              ?.getFilterValue() as string) ?? "")
                                }
                                onChange={(event) => {
                                    if (onSearchChange) {
                                        onSearchChange(event.target.value)
                                    } else {
                                        table
                                            .getColumn(searchKey)
                                            ?.setFilterValue(event.target.value)
                                    }
                                }}
                                className="pr-20 pl-10"
                            />
                            <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                                {currentSearchValue ? <Kbd>Esc</Kbd> : <Kbd>{modifierKey} K</Kbd>}
                            </div>
                        </div>
                    )}
                    {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
                </div>
            )}
            {isLoading && useSkeleton && skeletonConfig ? (
                <TableSkeleton config={skeletonConfig} />
            ) : (
                <div className="overflow-x-auto rounded-sm border border-ds-surface-border bg-ds-surface">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef.header,
                                                          header.getContext()
                                                      )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-32 text-center"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Spinner className="size-6" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        onClick={() => onRowClick?.(row.original)}
                                        className={onRowClick ? "cursor-pointer" : ""}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className={emptyState ? "p-0" : "h-24 text-center"}
                                    >
                                        {emptyState || "No results."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {!hidePagination && paginationInfo && (data.length > 0 || isLoading) && (
                <div className="mt-4 flex items-center justify-between">
                    {showPageInfo && (
                        <div className="text-ds-fg-muted text-sm">
                            {paginationInfo.total > 0 ? (
                                <>
                                    Showing{" "}
                                    {(paginationInfo.currentPage - 1) * paginationInfo.limit + 1}-
                                    {Math.min(
                                        paginationInfo.currentPage * paginationInfo.limit,
                                        paginationInfo.total
                                    )}{" "}
                                    of {paginationInfo.total} {pageInfoLabel || "items"}
                                </>
                            ) : (
                                <>No {pageInfoLabel || "items"} found</>
                            )}
                        </div>
                    )}
                    <div className="ml-auto flex gap-x-2">
                        {onPageSizeChange && pageSize && (
                            <PageSizeSelector
                                currentPageSize={pageSize}
                                onPageSizeChange={onPageSizeChange}
                                disabled={isLoading}
                            />
                        )}
                        {onPageChange && paginationInfo.totalPages > 1 && (
                            <Pagination
                                currentPage={paginationInfo.currentPage}
                                totalPages={paginationInfo.totalPages}
                                onPageChange={onPageChange}
                                isPlaceholderData={isPlaceholderData}
                                isFetching={isFetching}
                                hasMore={paginationInfo.currentPage < paginationInfo.totalPages}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
