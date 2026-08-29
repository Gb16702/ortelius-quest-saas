import { queryOptions, useQuery } from "@tanstack/react-query"
import { getResponseErrorMessage, readJsonResponse } from "@/shared/api/http.response"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    type OrganizationBusinessCatalogItem,
    organizationBusinessCatalogResponseSchema,
} from "../model/organization-business-catalog.schema"

type OrganizationBusinessCatalogKind = "categories" | "services"

interface OrganizationBusinessCatalogQueryOptions {
    initialData?: OrganizationBusinessCatalogItem[]
}

export const organizationBusinessCatalogKeys = {
    all: ["organization", "business-catalog"] as const,
    catalog: (organizationId: string, catalogKind: OrganizationBusinessCatalogKind) =>
        [...organizationBusinessCatalogKeys.all, organizationId, catalogKind] as const,
    categories: (organizationId: string) =>
        organizationBusinessCatalogKeys.catalog(organizationId, "categories"),
    services: (organizationId: string) =>
        organizationBusinessCatalogKeys.catalog(organizationId, "services"),
}

async function fetchOrganizationBusinessCatalog(
    organizationId: string,
    catalogPath: OrganizationBusinessCatalogKind,
    catalogLabel: string
): Promise<OrganizationBusinessCatalogItem[]> {
    const response = await fetch(`/api/organizations/${organizationId}/${catalogPath}/all`, {
        credentials: "include",
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw new Error(getResponseErrorMessage(payload, `Failed to load ${catalogLabel}`))
    }

    const parsed = safeParseSchema(organizationBusinessCatalogResponseSchema, payload)
    if (!parsed.success) {
        throw new Error(`Failed to load ${catalogLabel}: Invalid response format`)
    }

    if (!parsed.data.success) {
        throw new Error(
            `Failed to load ${catalogLabel}: ${parsed.data.message || "Invalid response format"}`
        )
    }

    return parsed.data.data
}

export function organizationBusinessCatalogQueryOptions(
    organizationId: string,
    catalogKind: OrganizationBusinessCatalogKind,
    catalogLabel: string
) {
    return queryOptions({
        queryKey: organizationBusinessCatalogKeys.catalog(organizationId, catalogKind),
        queryFn: () => fetchOrganizationBusinessCatalog(organizationId, catalogKind, catalogLabel),
        staleTime: 30_000,
    })
}

export function organizationCategoriesQueryOptions(organizationId: string) {
    return organizationBusinessCatalogQueryOptions(organizationId, "categories", "categories")
}

export function organizationServicesQueryOptions(organizationId: string) {
    return organizationBusinessCatalogQueryOptions(organizationId, "services", "services")
}

function useOrganizationBusinessCatalog(
    organizationId: string,
    catalogKind: OrganizationBusinessCatalogKind,
    catalogLabel: string,
    options?: OrganizationBusinessCatalogQueryOptions
) {
    return useQuery({
        ...organizationBusinessCatalogQueryOptions(organizationId, catalogKind, catalogLabel),
        enabled: !!organizationId,
        ...(options?.initialData !== undefined ? { initialData: options.initialData } : {}),
    })
}

export function useOrganizationCategories(
    organizationId: string,
    options?: OrganizationBusinessCatalogQueryOptions
) {
    return useOrganizationBusinessCatalog(organizationId, "categories", "categories", options)
}

export function useOrganizationServices(
    organizationId: string,
    options?: OrganizationBusinessCatalogQueryOptions
) {
    return useOrganizationBusinessCatalog(organizationId, "services", "services", options)
}
