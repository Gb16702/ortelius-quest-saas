import { useQuery } from "@tanstack/react-query"
import * as v from "valibot"
import { activityPageSchema } from "@/entities/activity"
import { getResponseErrorMessage, readJsonResponse } from "@/shared/api/http.response"
import { dashboardKeys } from "../../api/dashboard.query-keys"

const recentActivityResponseSchema = v.looseObject({
    success: v.literal(true),
    data: activityPageSchema,
})

export function useRecentActivity(
    organizationSlug: string,
    organizationId: string | null,
    limit = 5
) {
    return useQuery({
        queryKey: dashboardKeys.recentActivity(organizationSlug, organizationId, limit),
        queryFn: async () => {
            if (!organizationId) throw new Error("organizationId is required")

            const params = new URLSearchParams({
                limit: String(limit),
                organizationId,
            })

            const res = await fetch(`/api/activity?${params}`, {
                credentials: "include",
                headers: { "x-organization-id": organizationId },
            })

            const json = await readJsonResponse(res)
            if (!res.ok) {
                throw new Error(getResponseErrorMessage(json, "Failed to fetch recent activity"))
            }

            return v.parse(recentActivityResponseSchema, json).data.events
        },
        enabled: !!organizationSlug && !!organizationId,
        staleTime: 30_000,
    })
}
