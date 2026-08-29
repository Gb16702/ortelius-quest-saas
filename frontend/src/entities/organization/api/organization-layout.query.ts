import { queryOptions } from "@tanstack/react-query"
import { getResponseErrorMessage, readJsonResponse } from "@/shared/api/http.response"
import {
    type OrganizationLayoutInfo,
    parseOrganizationLayoutShowcaseResponse,
} from "../model/organization-showcase.schema"

export const organizationLayoutShowcaseKeys = {
    all: ["organization-layout-showcase"] as const,
    detail: (slug: string) => [...organizationLayoutShowcaseKeys.all, slug] as const,
}

export const organizationWorkspaceBootstrapKeys = {
    all: ["organization-workspace-bootstrap"] as const,
    detail: (slug: string) => [...organizationWorkspaceBootstrapKeys.all, slug] as const,
}

export async function fetchOrganizationLayoutShowcase(
    slug: string
): Promise<OrganizationLayoutInfo | null> {
    const response = await fetch(`/api/organizations/${encodeURIComponent(slug)}/showcase`, {
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    })

    if (response.status === 404) return null

    const data = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(getResponseErrorMessage(data, "Failed to fetch organization"))
    }

    return parseOrganizationLayoutShowcaseResponse(slug, data)
}

export function organizationLayoutShowcaseQueryOptions(slug: string) {
    return queryOptions({
        queryKey: organizationLayoutShowcaseKeys.detail(slug),
        queryFn: () => fetchOrganizationLayoutShowcase(slug),
        staleTime: 30 * 1000,
    })
}
