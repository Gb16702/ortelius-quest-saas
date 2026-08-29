import { createParser } from "nuqs"

const POSITIVE_INTEGER_PATTERN = /^\d+$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20] as const

function parsePositiveInteger(value: string): number | null {
    if (!POSITIVE_INTEGER_PATTERN.test(value)) return null

    const parsed = Number(value)
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function parseIsoDateString(value: string | null | undefined): string | null {
    if (!value || !ISO_DATE_PATTERN.test(value)) return null

    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime())) return null

    return date.toISOString().slice(0, 10) === value ? value : null
}

export function createDateFromIsoDateString(value: string | null | undefined): Date | null {
    const isoDate = parseIsoDateString(value)
    if (!isoDate) return null

    const [year, month, day] = isoDate.split("-").map(Number)
    const date = new Date(0)
    date.setFullYear(year, month - 1, day)
    date.setHours(0, 0, 0, 0)
    return date
}

export function createPositiveIntegerParser() {
    return createParser({
        parse: parsePositiveInteger,
        serialize: (value) => parsePositiveInteger(Math.round(value).toString())?.toString() ?? "1",
    })
}

export function createPageSizeParser(validPageSizes: readonly number[] = PAGE_SIZE_OPTIONS) {
    const validPageSizeSet = new Set(validPageSizes)
    const fallbackPageSize = validPageSizeSet.has(DEFAULT_PAGE_SIZE)
        ? DEFAULT_PAGE_SIZE
        : (validPageSizes[0] ?? DEFAULT_PAGE_SIZE)

    return createParser({
        parse: (value) => {
            const parsed = parsePositiveInteger(value)
            return parsed !== null && validPageSizeSet.has(parsed) ? parsed : null
        },
        serialize: (value) => {
            const parsed = parsePositiveInteger(Math.round(value).toString())
            return parsed !== null && validPageSizeSet.has(parsed)
                ? parsed.toString()
                : fallbackPageSize.toString()
        },
    })
}

export function createIsoDateStringParser() {
    return createParser({
        parse: parseIsoDateString,
        serialize: (value) => parseIsoDateString(value) ?? "",
    })
}

function canonicalizeCommaSeparatedEnumValue(
    value: string,
    validValues: readonly string[]
): string | null {
    if (value === "") return null

    const valueParts = value.split(",")
    const validValueSet = new Set(validValues)
    const requestedValues = new Set(valueParts)
    const hasOnlyAllowedValues = valueParts.every((item) => item !== "" && validValueSet.has(item))

    if (!hasOnlyAllowedValues) return null

    return validValues.filter((item) => requestedValues.has(item)).join(",")
}

export function createCommaSeparatedEnumParser(validValues: readonly string[]) {
    return createParser({
        parse: (value) => canonicalizeCommaSeparatedEnumValue(value, validValues),
        serialize: (value) => canonicalizeCommaSeparatedEnumValue(value, validValues) ?? "",
    })
}
