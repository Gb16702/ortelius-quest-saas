import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type { TimePeriod } from "../model/dashboard"
import { timePeriodSchema } from "../model/schemas/dashboard.schema"

export const DEFAULT_DASHBOARD_PERIOD: TimePeriod = 30

export function parseDashboardTimePeriod(value: unknown): TimePeriod | null {
    const result = safeParseSchema(timePeriodSchema, Number(value))
    return result.success ? result.data : null
}

export function getDashboardTimePeriodFromSearchParams(searchParams: URLSearchParams): TimePeriod {
    return parseDashboardTimePeriod(searchParams.get("period")) ?? DEFAULT_DASHBOARD_PERIOD
}
