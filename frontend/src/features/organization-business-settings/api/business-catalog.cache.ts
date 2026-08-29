import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type { OrganizationBusinessCatalogItem } from "@/entities/organization-business-catalog"

export interface BusinessCatalogSelectionPatch {
    add?: string[]
    remove?: string[]
}

export interface BusinessCatalogOptimisticContext {
    previousCatalog?: OrganizationBusinessCatalogItem[]
}

export function applyBusinessCatalogSelectionPatch(
    items: OrganizationBusinessCatalogItem[],
    patch: BusinessCatalogSelectionPatch
): OrganizationBusinessCatalogItem[] {
    const additions = new Set(patch.add ?? [])
    const removals = new Set(patch.remove ?? [])

    return items.map((item) => {
        if (additions.has(item.id)) {
            return { ...item, isSelected: true }
        }

        if (removals.has(item.id)) {
            return { ...item, isSelected: false }
        }

        return item
    })
}

export async function applyOptimisticBusinessCatalogSelection(
    queryClient: QueryClient,
    queryKey: QueryKey,
    patch: BusinessCatalogSelectionPatch
): Promise<BusinessCatalogOptimisticContext> {
    await queryClient.cancelQueries({ queryKey })
    const previousCatalog = queryClient.getQueryData<OrganizationBusinessCatalogItem[]>(queryKey)

    queryClient.setQueryData<OrganizationBusinessCatalogItem[]>(queryKey, (currentCatalog) =>
        currentCatalog ? applyBusinessCatalogSelectionPatch(currentCatalog, patch) : currentCatalog
    )

    return { previousCatalog }
}

export function restoreBusinessCatalogSelection(
    queryClient: QueryClient,
    queryKey: QueryKey,
    context: BusinessCatalogOptimisticContext | undefined
) {
    if (context?.previousCatalog) {
        queryClient.setQueryData(queryKey, context.previousCatalog)
    }
}
