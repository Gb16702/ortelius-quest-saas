import {
    type InfiniteData,
    keepPreviousData,
    useInfiniteQuery,
    useQuery,
} from "@tanstack/react-query"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    type ActivityPage,
    type ActivityScore,
    activityEventsResponseSchema,
    activityEventTypesResponseSchema,
    activityScoreResponseSchema,
    type DatePreset,
    type EventTypeInfo,
} from "../model/activity.schema"
import {
    createActivityEventsSearchParams,
    getActivityErrorMessage,
} from "./activity-events-request"

interface UseActivityEventsParams {
    organizationId: string
    organizationSlug: string
    actorId: string | null
    datePreset: DatePreset
    eventTypes: string[] | null
}

interface FetchActivityEventsPageParams extends UseActivityEventsParams {
    cursor?: string
}

interface UseActivityScoreParams {
    organizationId: string | null
    organizationSlug: string
    actorId: string | null
    days: number
}

export type ActivityEventsInfiniteData = InfiniteData<ActivityPage, string | undefined>

export const activityKeys = {
    all: ["activity"] as const,
    scope: (organizationId: string, organizationSlug: string) =>
        [...activityKeys.all, organizationId, organizationSlug] as const,
    events: (
        organizationId: string,
        organizationSlug: string,
        params: {
            actorId: string | null
            datePreset: DatePreset
            eventTypes: string | null
        }
    ) => [...activityKeys.scope(organizationId, organizationSlug), "events", params] as const,
    eventTypes: (organizationId: string, organizationSlug: string) =>
        [...activityKeys.scope(organizationId, organizationSlug), "event-types"] as const,
    score: (
        organizationId: string | null,
        organizationSlug: string,
        params: {
            actorId: string | null
            days: number
        }
    ) => [...activityKeys.all, organizationId, organizationSlug, "score", params] as const,
}

export function createActivityEventsInfiniteInitialData(
    firstPage: ActivityPage | null | undefined
): ActivityEventsInfiniteData | undefined {
    if (!firstPage) return undefined

    return {
        pages: [firstPage],
        pageParams: [undefined],
    }
}

export function useActivityEvents(
    { organizationId, organizationSlug, actorId, datePreset, eventTypes }: UseActivityEventsParams,
    options?: { initialPage?: ActivityPage | null }
) {
    return useInfiniteQuery<ActivityPage>({
        ...activityEventsInfiniteQueryOptions({
            organizationId,
            organizationSlug,
            actorId,
            datePreset,
            eventTypes,
        }),
        ...(options?.initialPage
            ? { initialData: createActivityEventsInfiniteInitialData(options.initialPage) }
            : {}),
        placeholderData: keepPreviousData,
        enabled:
            !!organizationId &&
            !!organizationSlug &&
            (eventTypes === null || eventTypes.length > 0),
    })
}

export function activityEventsInfiniteQueryOptions({
    organizationId,
    organizationSlug,
    actorId,
    datePreset,
    eventTypes,
}: UseActivityEventsParams) {
    const eventTypesKey = eventTypes === null ? null : eventTypes.join(",")

    return {
        queryKey: activityKeys.events(organizationId, organizationSlug, {
            actorId,
            datePreset,
            eventTypes: eventTypesKey,
        }),
        queryFn: ({ pageParam }: { pageParam: unknown }) =>
            fetchActivityEventsPage({
                organizationId,
                organizationSlug,
                actorId,
                datePreset,
                eventTypes,
                cursor: typeof pageParam === "string" ? pageParam : undefined,
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: ActivityPage) => lastPage.nextCursor ?? undefined,
        staleTime: 30_000,
    }
}

export async function fetchActivityEventsPage({
    organizationId,
    actorId,
    datePreset,
    eventTypes,
    cursor,
}: FetchActivityEventsPageParams): Promise<ActivityPage> {
    const params = createActivityEventsSearchParams({
        organizationId,
        actorId,
        datePreset,
        eventTypes,
        cursor,
    })
    const res = await fetch(`/api/activity?${params}`, {
        credentials: "include",
        headers: { "x-organization-id": organizationId },
    })

    const json = await readJsonResponse(res)

    if (!res.ok) {
        throw new Error(getActivityErrorMessage(json, "Failed to fetch activity"))
    }

    return parseSchema(activityEventsResponseSchema, json).data
}

export function useActivityEventTypes(organizationId: string, organizationSlug: string) {
    return useQuery<EventTypeInfo[]>({
        queryKey: activityKeys.eventTypes(organizationId, organizationSlug),
        queryFn: async () => {
            const params = new URLSearchParams({ organizationId })
            const res = await fetch(`/api/activity/event-types?${params}`, {
                credentials: "include",
                headers: { "x-organization-id": organizationId },
            })

            const json = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(getActivityErrorMessage(json, "Failed to fetch event types"))
            }

            return parseSchema(activityEventTypesResponseSchema, json).data
        },
        enabled: !!organizationId && !!organizationSlug,
        staleTime: 60_000,
    })
}

export function useActivityScore({
    organizationId,
    organizationSlug,
    actorId,
    days,
}: UseActivityScoreParams) {
    return useQuery<ActivityScore>({
        queryKey: activityKeys.score(organizationId, organizationSlug, { actorId, days }),
        queryFn: async () => {
            if (!organizationId || !actorId) {
                throw new Error("Organization and actor are required")
            }

            const params = new URLSearchParams({
                organizationId,
                actorId,
                days: String(days),
            })
            const res = await fetch(`/api/activity/score?${params}`, {
                credentials: "include",
                headers: { "x-organization-id": organizationId },
            })

            const json = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(getActivityErrorMessage(json, "Failed to fetch activity score"))
            }

            return parseSchema(activityScoreResponseSchema, json).data
        },
        enabled: !!organizationId && !!organizationSlug && !!actorId,
        staleTime: 60_000,
    })
}
