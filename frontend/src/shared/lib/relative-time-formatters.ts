import { formatCompactTimeUnit, formatTimeUnit, type TimeUnits } from "./time-calculations"

export const formatRelativeTimeString = (units: TimeUnits): string => {
    const { seconds, minutes, hours, days, weeks, months, years } = units

    if (seconds < 60) return "few seconds ago"
    if (minutes < 60) return formatTimeUnit(minutes, "minute")
    if (hours < 24) return formatTimeUnit(hours, "hour")
    if (days < 7) return formatTimeUnit(days, "day")
    if (weeks < 4) return formatTimeUnit(weeks, "week")
    if (months < 12) return formatTimeUnit(months, "month")
    return formatTimeUnit(years, "year")
}

export const formatCompactRelativeTimeString = (units: TimeUnits): string => {
    const { seconds, minutes, hours, days, weeks, months, years } = units

    if (seconds < 60) return "now"
    if (minutes < 60) return `${formatCompactTimeUnit(minutes, "minute")} ago`
    if (hours < 24) return `${formatCompactTimeUnit(hours, "hour")} ago`
    if (days < 7) return `${formatCompactTimeUnit(days, "day")} ago`
    if (months < 1) return `${formatCompactTimeUnit(weeks, "week")} ago`
    if (months < 12) return `${formatCompactTimeUnit(months, "month")} ago`
    return `${formatCompactTimeUnit(years, "year")} ago`
}
