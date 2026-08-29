import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { activityEventsResponseSchema, type DatePreset } from "../model/activity.schema"
import {
    createActivityEventsSearchParams,
    getActivityErrorMessage,
} from "./activity-events-request"

interface FetchActivityEventsPageServerParams {
    organizationId: string
    actorId: string | null
    datePreset: DatePreset
    eventTypes: string[] | null
    cursor?: string
    accessToken: string
}

export async function fetchActivityEventsPageServer({
    organizationId,
    actorId,
    datePreset,
    eventTypes,
    cursor,
    accessToken,
}: FetchActivityEventsPageServerParams) {
    const params = createActivityEventsSearchParams({
        organizationId,
        actorId,
        datePreset,
        eventTypes,
        cursor,
    })
    const response = await fetch(`${serverEnv.API_URL}/api/activity?${params}`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    })

    const json = await readJsonResponse(response)

    if (!response.ok) {
        throw new Error(getActivityErrorMessage(json, "Failed to fetch activity"))
    }

    return parseSchema(activityEventsResponseSchema, json).data
}
