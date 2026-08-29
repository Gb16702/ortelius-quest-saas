import { useQuery } from "@tanstack/react-query"
import { type CurrentSubscription, currentSubscriptionSchema } from "@/entities/subscription"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

const memberSubscriptionCapacityKeys = {
    scope: (organizationId: string | null | undefined) =>
        ["subscription", organizationId ?? null] as const,
    current: (organizationId: string | null | undefined) =>
        [...memberSubscriptionCapacityKeys.scope(organizationId), "current"] as const,
}

async function fetchCurrentSubscription(): Promise<CurrentSubscription> {
    const res = await fetch(`/api/subscription/current`, {
        credentials: "include",
    })
    if (!res.ok) throw new Error("Failed to fetch subscription")
    return parseSchema(currentSubscriptionSchema, await readJsonResponse(res))
}

export function useMemberSubscriptionCapacity(organizationId: string | null | undefined) {
    return useQuery({
        queryKey: memberSubscriptionCapacityKeys.current(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchCurrentSubscription()
        },
        enabled: !!organizationId,
        staleTime: 30_000,
    })
}
