import { useQuery } from "@tanstack/react-query"
import { getResponseErrorMessage, readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    type OrganizationSetupStatus,
    organizationSetupStatusResponseSchema,
} from "../model/organization-setup"

async function fetchSetupStatus(organizationId: string): Promise<OrganizationSetupStatus> {
    const response = await fetch(`/api/organizations/${organizationId}/setup-status`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    })

    const data = await readJsonResponse(response)

    if (!response.ok) {
        throw new Error(getResponseErrorMessage(data, "Failed to fetch setup status"))
    }

    return parseSchema(organizationSetupStatusResponseSchema, data).data
}

export const organizationSetupKeys = {
    all: ["organization-setup"] as const,
    detail: (organizationId: string | null | undefined) =>
        [...organizationSetupKeys.all, organizationId ?? null] as const,
}

export function useOrganizationSetup(organizationId: string | null) {
    return useQuery({
        queryKey: organizationSetupKeys.detail(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchSetupStatus(organizationId)
        },
        enabled: !!organizationId,
        staleTime: 30 * 1000,
    })
}
