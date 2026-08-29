import { describe, expect, it, mock } from "bun:test"

mock.module("@stripe/stripe-js", () => ({
    loadStripe: () => Promise.resolve(null),
}))

async function getMatchedRouteIds(pathname: string): Promise<string[]> {
    const { getRouter } = await import("../router")

    return getRouter()
        .getMatchedRoutes(pathname)
        .matchedRoutes.map((route) => route.id)
}

describe("org workspace routing", () => {
    it("keeps unknown organization workspace paths inside the workspace route branch", async () => {
        await expect(getMatchedRouteIds("/org/acme/nope-codex-audit")).resolves.toEqual([
            "__root__",
            "/_private/org/$slug/_workspace",
            "/_private/org/$slug/_workspace/$",
        ])
    })

    it("keeps the public organization showcase route on the org index branch", async () => {
        await expect(getMatchedRouteIds("/org/acme")).resolves.toEqual([
            "__root__",
            "/_public/org/$slug/",
        ])
    })
})
