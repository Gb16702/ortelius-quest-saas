import { queryOptions, useQuery } from "@tanstack/react-query"
import { readJsonResponse } from "@/shared/api/http.response"
import {
    type OrganizationInfo,
    parseOrganizationInfoResponse,
} from "../model/organization-info.schema"

export async function fetchOrganizationInfo(organizationId: string): Promise<OrganizationInfo> {
    const response = await fetch(`/api/organizations/${organizationId}/info`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
        throw new Error("Failed to fetch organization info")
    }

    const json = await readJsonResponse(response)
    return parseOrganizationInfoResponse(organizationId, json)
}

export const organizationInfoKeys = {
    all: ["organization-info"] as const,
    detail: (organizationId: string | null | undefined) =>
        [...organizationInfoKeys.all, organizationId ?? null] as const,
}

export function organizationInfoQueryOptions(organizationId: string | null) {
    return queryOptions({
        queryKey: organizationInfoKeys.detail(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchOrganizationInfo(organizationId)
        },
        staleTime: 30 * 1000,
    })
}

export function useOrganizationInfo(
    organizationId: string | null,
    options?: { placeholderData?: OrganizationInfo }
) {
    return useQuery({
        ...organizationInfoQueryOptions(organizationId),
        enabled: !!organizationId,
        ...(options?.placeholderData ? { placeholderData: options.placeholderData } : {}),
    })
}
