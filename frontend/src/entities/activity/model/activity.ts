import type { ActivityEvent, DatePreset } from "./activity.schema"

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
    all: "All time",
    "7d": "Last 7 days",
    "14d": "Last 14 days",
    "30d": "Last 30 days",
    "3m": "Last 3 months",
    "12m": "Last 12 months",
}

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
})

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
})

interface MonthGroup {
    label: string
    events: ActivityEvent[]
}

export function groupEventsByMonth(events: ActivityEvent[]): MonthGroup[] {
    const groups: Map<string, ActivityEvent[]> = new Map()

    for (const event of events) {
        const date = new Date(event.createdAt)
        const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`

        if (!groups.has(key)) {
            groups.set(key, [])
        }
        groups.get(key)?.push(event)
    }

    return Array.from(groups.entries()).map(([_, events]) => ({
        label: monthYearFormatter.format(new Date(events[0].createdAt)),
        events,
    }))
}

export function formatRelativeDate(isoDate: string): string {
    const date = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60))
            return diffMinutes <= 1 ? "just now" : `${diffMinutes}m`
        }
        return `${diffHours}h`
    }

    if (diffDays <= 7) {
        return `${diffDays}d`
    }

    return shortDateFormatter.format(date)
}
