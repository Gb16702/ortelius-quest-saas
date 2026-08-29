import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/ui/button"

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    siblingCount?: number
    className?: string
    isPlaceholderData?: boolean
    isFetching?: boolean
    hasMore?: boolean
}

export const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    siblingCount = 1,
    className = "",
    isPlaceholderData = false,
    isFetching = false,
    hasMore = true,
}: PaginationProps) => {
    const generatePageNumbers = () => {
        const delta = siblingCount
        const range = []
        const rangeWithDots = []

        for (
            let i = Math.max(2, currentPage - delta);
            i <= Math.min(totalPages - 1, currentPage + delta);
            i++
        ) {
            range.push(i)
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, "...")
        } else {
            rangeWithDots.push(1)
        }

        rangeWithDots.push(...range)

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push("...", totalPages)
        } else {
            rangeWithDots.push(totalPages)
        }

        return rangeWithDots
    }

    const pages = totalPages > 1 ? generatePageNumbers() : []

    if (totalPages <= 1) return null

    return (
        <div className={"flex w-full items-center justify-end"}>
            <div className="flex items-center gap-3">
                <div
                    className={`flex items-center gap-1 rounded-sm border border-ds-surface-border bg-ds-surface p-1 ${className}`}
                >
                    {currentPage > 1 && (
                        <Button
                            radius="full"
                            variant="ghost"
                            size="sm"
                            onClick={() => onPageChange(currentPage - 1)}
                            aria-label="Previous page"
                            disabled={isFetching}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                    )}

                    {pages.map((page, index) => {
                        if (page === "...") {
                            const leftEllipsis = index < pages.length / 2
                            return (
                                <span
                                    key={`ellipsis-${leftEllipsis ? "left" : "right"}-${currentPage}`}
                                    className="flex h-6 w-6 items-center justify-center text-gray-500 text-sm"
                                >
                                    ...
                                </span>
                            )
                        }

                        const pageNumber = page as number
                        const isActive = pageNumber === currentPage

                        return (
                            <Button
                                className="min-w-fit"
                                key={pageNumber}
                                variant={isActive ? "solid" : "ghost"}
                                size="sm"
                                radius="full"
                                onClick={() => onPageChange(pageNumber)}
                                aria-label={`Page ${pageNumber}`}
                                aria-current={isActive ? "page" : undefined}
                                disabled={isFetching}
                            >
                                {pageNumber}
                            </Button>
                        )
                    })}

                    {currentPage < totalPages && (
                        <Button
                            radius="full"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (!isPlaceholderData && hasMore) {
                                    onPageChange(currentPage + 1)
                                }
                            }}
                            aria-label="Next page"
                            disabled={isPlaceholderData || !hasMore || isFetching}
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
