import { describe, expect, it } from "bun:test"
import { QueryClient } from "@tanstack/react-query"
import {
    getOrgRoutePrefetchTarget,
    getOrgRouteWarmCacheTargets,
    hasFreshPrefetchData,
    shouldSkipAutomaticWarmCacheForConnection,
} from "../use-org-route-data-prefetch"

describe("org route data prefetch", () => {
    it("keeps sidebar intent prefetch mapped to the hovered destination", () => {
        expect(getOrgRoutePrefetchTarget("/org/acme/requests", "acme")).toBe("requests")
        expect(getOrgRoutePrefetchTarget("/org/acme/team/members", "acme")).toBe("team-members")
        expect(getOrgRoutePrefetchTarget("/org/acme/settings/business", "acme")).toBe(
            "settings-business"
        )
        expect(getOrgRoutePrefetchTarget("/org/acme/settings/branding", "acme")).toBe("settings")
    })

    it("does not automatically warm unrelated workspace data from settings pages", () => {
        expect(
            getOrgRouteWarmCacheTargets({
                pathname: "/org/acme/settings/branding",
                slug: "acme",
                isAdmin: true,
            })
        ).toEqual([])
        expect(
            getOrgRouteWarmCacheTargets({
                pathname: "/org/acme/settings/invoices",
                slug: "acme",
                isAdmin: true,
            })
        ).toEqual([])
    })

    it("keeps automatic business settings warm-cache scoped to business data", () => {
        expect(
            getOrgRouteWarmCacheTargets({
                pathname: "/org/acme/settings/business",
                slug: "acme",
                isAdmin: true,
            })
        ).toEqual(["settings-business"])
        expect(
            getOrgRouteWarmCacheTargets({
                pathname: "/org/acme/settings/business",
                slug: "acme",
                isAdmin: false,
            })
        ).toEqual([])
    })

    it("keeps dashboard automatic warm-cache focused on nearby dashboard and requests data", () => {
        expect(
            getOrgRouteWarmCacheTargets({
                pathname: "/org/acme/dashboard",
                slug: "acme",
                isAdmin: true,
            })
        ).toEqual(["dashboard-contributions", "requests"])
        expect(
            getOrgRouteWarmCacheTargets({
                pathname: "/org/acme/dashboard/organization",
                slug: "acme",
                isAdmin: true,
            })
        ).toEqual([])
    })

    it("respects connection conditions before starting automatic warm-cache", () => {
        expect(shouldSkipAutomaticWarmCacheForConnection(null)).toBe(false)
        expect(shouldSkipAutomaticWarmCacheForConnection({ effectiveType: "4g" })).toBe(false)
        expect(shouldSkipAutomaticWarmCacheForConnection({ saveData: true })).toBe(true)
        expect(shouldSkipAutomaticWarmCacheForConnection({ effectiveType: "2g" })).toBe(true)
        expect(shouldSkipAutomaticWarmCacheForConnection({ effectiveType: "slow-2g" })).toBe(true)
    })

    it("treats successful cached data as fresh only within the target stale window", () => {
        const queryClient = new QueryClient()
        const queryKey = ["org", "requests"] as const
        const now = 10_000

        expect(hasFreshPrefetchData(queryClient, queryKey, 1_000, now)).toBe(false)

        queryClient.setQueryData(queryKey, { rows: [] }, { updatedAt: now - 500 })
        expect(hasFreshPrefetchData(queryClient, queryKey, 1_000, now)).toBe(true)
        expect(hasFreshPrefetchData(queryClient, queryKey, 100, now)).toBe(false)
    })
})
