import type { DateRange } from "react-day-picker"
import { formatDateToISO } from "@/shared/lib/date"
import { createDateFromIsoDateString, parseIsoDateString } from "@/shared/lib/url.state"
import { FILTER_STATES } from "./request-url.state"

export function parseRequestStatusFilter(statusFilter: string | null | undefined): string[] {
    if (statusFilter === FILTER_STATES.REQUEST_LIFECYCLE_STATUS.EMPTY) return []
    return parseRequestFilterValues(statusFilter)
}

export function parseRequestFilterValues(filterValue: string | null | undefined): string[] {
    return (filterValue || "").split(",").filter(Boolean)
}

export function createRequestDateRange(
    fromDate: string | null | undefined,
    toDate: string | null | undefined
): DateRange | undefined {
    const normalizedDates = normalizeRequestDateFilterValues(fromDate, toDate)
    const from = createDateFromIsoDateString(normalizedDates.from)
    if (!from) return undefined

    return {
        from,
        to: createDateFromIsoDateString(normalizedDates.to) ?? undefined,
    }
}

export function normalizeRequestDateFilterValues(
    fromDate: string | null | undefined,
    toDate: string | null | undefined
): {
    from: string
    to: string
} {
    const from = parseIsoDateString(fromDate)
    if (!from) return { from: "", to: "" }

    const to = parseIsoDateString(toDate)
    if (!to) return { from, to: "" }

    const fromDateValue = createDateFromIsoDateString(from)
    const toDateValue = createDateFromIsoDateString(to)
    if (!fromDateValue || !toDateValue || toDateValue <= fromDateValue) {
        return { from, to: "" }
    }

    return { from, to }
}

export function toRequestStatusFilterValue(statuses: string[]): string {
    return statuses.length === 0 ? FILTER_STATES.REQUEST_LIFECYCLE_STATUS.EMPTY : statuses.join(",")
}

export function toRequestDateFilterValues(dateRange: DateRange | undefined): {
    from: string | null
    to: string | null
} {
    if (!dateRange?.from && !dateRange?.to) {
        return { from: null, to: null }
    }

    const from = dateRange?.from ? formatDateToISO(dateRange.from) : null
    const to = dateRange?.to ? formatDateToISO(dateRange.to) : null

    const normalizedDates = normalizeRequestDateFilterValues(from, to)

    return {
        from: normalizedDates.from || null,
        to: normalizedDates.to || null,
    }
}
