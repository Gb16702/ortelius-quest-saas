import type { DateRange } from "react-day-picker"
import {
    formatCompactRelativeTimeString,
    formatRelativeTimeString,
} from "./relative-time-formatters"
import { calculateTimeUnits } from "./time-calculations"

type DateFormat = "short" | "medium" | "long" | "full"

interface DateFormatOptions {
    format?: DateFormat
    locale?: string
    separator?: string
}

const FORMAT_PRESETS: Record<DateFormat, Intl.DateTimeFormatOptions> = {
    short: { month: "short", day: "numeric" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric" },
    full: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
}

export function formatDate(date: Date | undefined, options: DateFormatOptions = {}): string {
    if (!date) return ""

    const { format = "medium", locale = "en-US" } = options
    const formatOptions = FORMAT_PRESETS[format]

    return date.toLocaleDateString(locale, formatOptions)
}

export function formatUploadDate(value: string): string {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "—"
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfParsed = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
    const dayDiff = Math.round(
        (startOfToday.getTime() - startOfParsed.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (dayDiff === 0) return "today"
    if (dayDiff === 1) return "yesterday"
    if (dayDiff > 1 && dayDiff < 7) return `${dayDiff} days ago`
    return parsed.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

export function formatDateRange(
    range: DateRange | undefined,
    options: DateFormatOptions = {}
): string {
    if (!range?.from) return "Select date range"

    const { format = "medium", locale = "en-US", separator = " to " } = options

    if (!range.to) {
        return formatDate(range.from, { format, locale })
    }

    const sameYear = range.from.getFullYear() === range.to.getFullYear()
    const sameMonth = sameYear && range.from.getMonth() === range.to.getMonth()

    if (sameMonth) {
        const month = range.from.toLocaleDateString(locale, { month: "long" })
        const fromDay = range.from.getDate()
        const toDay = range.to.getDate()
        const year = range.from.getFullYear()
        return `${month} ${fromDay}${separator}${toDay}, ${year}`
    }

    const fromStr = formatDate(range.from, { format, locale })
    const toStr = formatDate(range.to, { format, locale })

    return `${fromStr}${separator}${toStr}`
}

export const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    })
}

export const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const units = calculateTimeUnits(diffMs)
    return formatRelativeTimeString(units)
}

const formatDateShort = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    })
}

export const formatDateRangeShort = (fromDate: Date | string, toDate: Date | string): string => {
    const from = formatDateShort(fromDate)
    const to = formatDateShort(toDate)
    return `${from} to ${to}`
}

export const formatDateLong = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" })
}

export const formatRelativeTimeCompact = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const units = calculateTimeUnits(diffMs)
    return formatCompactRelativeTimeString(units)
}

export const formatDateRangeSmart = (range: DateRange | undefined): string => {
    if (!range?.from) return "Select date range"

    if (!range.to) {
        return range.from.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })
    }

    const sameDate = range.from.getTime() === range.to.getTime()
    if (sameDate) {
        const currentYear = new Date().getFullYear()
        const dateYear = range.from.getFullYear()

        if (dateYear === currentYear) {
            return range.from.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            })
        }
        return range.from.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
    }

    const currentYear = new Date().getFullYear()
    const fromYear = range.from.getFullYear()
    const toYear = range.to.getFullYear()
    const sameYear = fromYear === toYear
    const sameMonth = sameYear && range.from.getMonth() === range.to.getMonth()
    const isCurrentYear = sameYear && fromYear === currentYear

    if (sameMonth) {
        const month = range.from.toLocaleDateString("en-US", { month: "short" })
        const fromDay = range.from.getDate()
        const toDay = range.to.getDate()

        if (isCurrentYear) {
            return `${month} ${fromDay} - ${toDay}`
        }
        return `${month} ${fromDay} - ${toDay} ${fromYear}`
    }

    if (sameYear) {
        const fromMonth = range.from.toLocaleDateString("en-US", {
            month: "short",
        })
        const toMonth = range.to.toLocaleDateString("en-US", { month: "short" })
        const fromDay = range.from.getDate()
        const toDay = range.to.getDate()

        if (isCurrentYear) {
            return `${fromMonth} ${fromDay} - ${toMonth} ${toDay}`
        }
        return `${fromMonth} ${fromDay} - ${toMonth} ${toDay} ${fromYear}`
    }

    const fromFormatted = range.from.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
    const toFormatted = range.to.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })

    return `${fromFormatted} - ${toFormatted}`
}

export const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

export const formatSearchDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    const now = new Date()

    const time = dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    })

    const isToday =
        dateObj.getDate() === now.getDate() &&
        dateObj.getMonth() === now.getMonth() &&
        dateObj.getFullYear() === now.getFullYear()

    if (isToday) {
        return `Today at ${time}`
    }

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday =
        dateObj.getDate() === yesterday.getDate() &&
        dateObj.getMonth() === yesterday.getMonth() &&
        dateObj.getFullYear() === yesterday.getFullYear()

    if (isYesterday) {
        return `Yesterday at ${time}`
    }

    const isThisYear = dateObj.getFullYear() === now.getFullYear()

    if (isThisYear) {
        const dateStr = dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })
        return `${dateStr} at ${time}`
    }

    const dateStr = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
    return `${dateStr} at ${time}`
}
