import { describe, expect, it } from "bun:test"
import { QueryClient } from "@tanstack/react-query"
import {
    type OrganizationBusinessCatalogItem,
    organizationBusinessCatalogKeys,
} from "@/entities/organization-business-catalog"
import {
    applyBusinessCatalogSelectionPatch,
    applyOptimisticBusinessCatalogSelection,
    restoreBusinessCatalogSelection,
} from "../business-catalog.cache"

function createCatalogItem(id: string, isSelected: boolean): OrganizationBusinessCatalogItem {
    return {
        id,
        name: `Item ${id}`,
        slug: id,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        isSelected,
    }
}

describe("settings business catalog cache", () => {
    it("scopes category and service query keys by organization", () => {
        expect(organizationBusinessCatalogKeys.categories("org_123")).toEqual([
            "organization",
            "business-catalog",
            "org_123",
            "categories",
        ])
        expect(organizationBusinessCatalogKeys.services("org_456")).toEqual([
            "organization",
            "business-catalog",
            "org_456",
            "services",
        ])
    })

    it("applies selected catalog id patches without changing untouched item references", () => {
        const catalog = [
            createCatalogItem("cat_1", true),
            createCatalogItem("cat_2", false),
            createCatalogItem("cat_3", true),
        ]

        const patched = applyBusinessCatalogSelectionPatch(catalog, {
            add: ["cat_2"],
            remove: ["cat_1"],
        })

        expect(patched.map((item) => [item.id, item.isSelected])).toEqual([
            ["cat_1", false],
            ["cat_2", true],
            ["cat_3", true],
        ])
        expect(patched[2]).toBe(catalog[2])
    })

    it("updates and restores the query-owned catalog cache", async () => {
        const queryClient = new QueryClient()
        const queryKey = organizationBusinessCatalogKeys.services("org_123")
        const catalog = [createCatalogItem("svc_1", true), createCatalogItem("svc_2", false)]

        queryClient.setQueryData(queryKey, catalog)

        const context = await applyOptimisticBusinessCatalogSelection(queryClient, queryKey, {
            add: ["svc_2"],
            remove: ["svc_1"],
        })

        expect(queryClient.getQueryData<OrganizationBusinessCatalogItem[]>(queryKey)).toEqual([
            { ...catalog[0], isSelected: false },
            { ...catalog[1], isSelected: true },
        ])
        expect(context.previousCatalog).toEqual(catalog)

        restoreBusinessCatalogSelection(queryClient, queryKey, context)

        expect(queryClient.getQueryData<OrganizationBusinessCatalogItem[]>(queryKey)).toEqual(
            catalog
        )
    })
})
