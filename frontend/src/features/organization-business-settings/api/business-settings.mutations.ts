import { type QueryClient, type QueryKey, useMutation, useQueryClient } from "@tanstack/react-query"
import * as v from "valibot"
import {
    applyOptimisticOrganizationSetupStatusPatch,
    invalidateOrganizationSetupStatus,
    type OrganizationSetupStatusPatch,
    type OrganizationSetupStatusPatchContext,
    restoreOrganizationSetupStatus,
} from "@/entities/organization"
import {
    type OrganizationBusinessCatalogItem,
    organizationBusinessCatalogKeys,
} from "@/entities/organization-business-catalog"
import { parseJsonResponse } from "@/shared/api/http.response"
import {
    applyBusinessCatalogSelectionPatch,
    applyOptimisticBusinessCatalogSelection,
    type BusinessCatalogSelectionPatch,
    restoreBusinessCatalogSelection,
} from "./business-catalog.cache"

const organizationPatchResultSchema = v.object({
    success: v.literal(true),
    message: v.optional(v.string()),
})

type OrganizationPatchResult = v.InferOutput<typeof organizationPatchResultSchema>

interface BusinessSetupOptimisticContext {
    previousCatalog?: OrganizationBusinessCatalogItem[]
    setupContext?: OrganizationSetupStatusPatchContext
}

async function parseOrganizationMutationResponse(
    res: Response,
    fallback: string
): Promise<OrganizationPatchResult> {
    return parseJsonResponse(res, organizationPatchResultSchema, fallback)
}

function hasSelectedItemsAfterPatch(
    currentItems: OrganizationBusinessCatalogItem[] | undefined,
    patch: BusinessCatalogSelectionPatch
): boolean | null {
    if (!currentItems) return null

    return applyBusinessCatalogSelectionPatch(currentItems, patch).some((item) => item.isSelected)
}

async function applyOptimisticBusinessSetupStatusPatch({
    queryClient,
    orgId,
    queryKey,
    data,
    setupPatchKey,
}: {
    queryClient: QueryClient
    orgId: string
    queryKey: QueryKey
    data: BusinessCatalogSelectionPatch
    setupPatchKey: keyof Pick<OrganizationSetupStatusPatch, "hasCargoTypes" | "hasServices">
}): Promise<BusinessSetupOptimisticContext> {
    const catalogContext = await applyOptimisticBusinessCatalogSelection(
        queryClient,
        queryKey,
        data
    )
    const hasSelection = hasSelectedItemsAfterPatch(catalogContext.previousCatalog, data)
    if (hasSelection === null) {
        return { ...catalogContext, setupContext: undefined }
    }

    const setupContext = await applyOptimisticOrganizationSetupStatusPatch(queryClient, orgId, {
        [setupPatchKey]: hasSelection,
    })

    return { ...catalogContext, setupContext }
}

export function useSaveOrganizationCategories(orgId: string) {
    const queryClient = useQueryClient()
    const queryKey = organizationBusinessCatalogKeys.categories(orgId)

    return useMutation({
        mutationFn: async (data: BusinessCatalogSelectionPatch) => {
            const res = await fetch(`/api/organizations/${orgId}/categories`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            return parseOrganizationMutationResponse(res, "Failed to update categories")
        },
        onMutate: (data) => {
            return applyOptimisticBusinessSetupStatusPatch({
                queryClient,
                orgId,
                queryKey,
                data,
                setupPatchKey: "hasCargoTypes",
            })
        },
        onError: (_error, _data, context) => {
            restoreBusinessCatalogSelection(queryClient, queryKey, context)
            restoreOrganizationSetupStatus(queryClient, orgId, context?.setupContext)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey })
            invalidateOrganizationSetupStatus(queryClient, orgId)
        },
    })
}

export function useSaveOrganizationServices(orgId: string) {
    const queryClient = useQueryClient()
    const queryKey = organizationBusinessCatalogKeys.services(orgId)

    return useMutation({
        mutationFn: async (data: BusinessCatalogSelectionPatch) => {
            const res = await fetch(`/api/organizations/${orgId}/services`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            return parseOrganizationMutationResponse(res, "Failed to update services")
        },
        onMutate: (data) => {
            return applyOptimisticBusinessSetupStatusPatch({
                queryClient,
                orgId,
                queryKey,
                data,
                setupPatchKey: "hasServices",
            })
        },
        onError: (_error, _data, context) => {
            restoreBusinessCatalogSelection(queryClient, queryKey, context)
            restoreOrganizationSetupStatus(queryClient, orgId, context?.setupContext)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey })
            invalidateOrganizationSetupStatus(queryClient, orgId)
        },
    })
}

export function useToggleEmailIntake(orgId: string) {
    return useMutation({
        mutationFn: async (enabled: boolean) => {
            const res = await fetch(`/api/organizations/${orgId}/email-intake`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled }),
            })
            return parseOrganizationMutationResponse(res, "Failed to update email intake")
        },
    })
}
