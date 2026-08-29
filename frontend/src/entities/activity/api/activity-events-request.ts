import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type { DatePreset } from "../model/activity.schema"
import { activityErrorResponseSchema } from "../model/activity.schema"

export const ACTIVITY_EVENTS_PAGE_SIZE = 25

interface CreateActivityEventsSearchParamsInput {
    organizationId: string
    actorId: string | null
    datePreset: DatePreset
    eventTypes: string[] | null
    cursor?: string
}

function getDateFromPreset(preset: DatePreset): Date | undefined {
    if (preset === "all") return undefined
    const map: Record<Exclude<DatePreset, "all">, number> = {
        "7d": 7,
        "14d": 14,
        "30d": 30,
        "3m": 90,
        "12m": 365,
    }
    return new Date(Date.now() - map[preset] * 86_400_000)
}

export function createActivityEventsSearchParams({
    organizationId,
    actorId,
    datePreset,
    eventTypes,
    cursor,
}: CreateActivityEventsSearchParamsInput): URLSearchParams {
    const eventTypesKey = eventTypes === null ? null : eventTypes.join(",")
    const params = new URLSearchParams()
    params.set("organizationId", organizationId)

    if (actorId) {
        params.set("actorId", actorId)
    }

    const fromDate = getDateFromPreset(datePreset)
    if (fromDate) {
        params.set("fromDate", fromDate.toISOString())
    }

    if (eventTypesKey !== null) {
        params.set("eventTypes", eventTypesKey)
    }

    if (cursor) {
        params.set("cursor", cursor)
    }

    params.set("limit", ACTIVITY_EVENTS_PAGE_SIZE.toString())

    return params
}

export function getActivityErrorMessage(payload: unknown, fallback: string): string {
    const result = safeParseSchema(activityErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.data.message || fallback
}
