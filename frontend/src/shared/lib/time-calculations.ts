export interface TimeUnits {
    seconds: number
    minutes: number
    hours: number
    days: number
    weeks: number
    months: number
    years: number
}

export const calculateTimeUnits = (diffMs: number): TimeUnits => {
    const seconds = Math.floor(diffMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    return { seconds, minutes, hours, days, weeks, months, years }
}

export const formatTimeUnit = (value: number, unit: string): string => {
    return value === 1 ? `1 ${unit} ago` : `${value} ${unit}s ago`
}

export const formatCompactTimeUnit = (value: number, unit: string): string => {
    const unitMap: Record<string, string> = {
        second: "s",
        minute: "m",
        hour: "h",
        day: "d",
        week: "w",
        month: "mo",
        year: "y",
    }

    return `${value}${unitMap[unit] || unit}`
}
