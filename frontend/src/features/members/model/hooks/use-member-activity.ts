import { useQuery } from "@tanstack/react-query"
import { activityEventsResponseSchema } from "@/entities/activity"
import { membersKeys } from "@/entities/member"
import { createApiError, readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

export function useMemberActivity(
    userId: string | null,
    organizationSlug: string | null,
    organizationId: string | null,
    limit = 3
) {
    return useQuery({
        queryKey: membersKeys.activity(organizationSlug, userId, limit),
        queryFn: async () => {
            if (!userId) throw new Error("userId is required")
            if (!organizationId) throw new Error("organizationId is required")
            const params = new URLSearchParams({
                actorId: userId,
                organizationId,
                limit: String(limit),
            })

            const res = await fetch(`/api/activity?${params}`, {
                credentials: "include",
                headers: { "x-organization-id": organizationId },
            })

            const json = await readJsonResponse(res)

            if (!res.ok) {
                throw createApiError(res.status, json, "Failed to fetch member activity")
            }

            return parseSchema(activityEventsResponseSchema, json).data.events
        },
        enabled: !!organizationSlug && !!organizationId && !!userId,
        staleTime: 30_000,
    })
}
