import { afterAll, afterEach, describe, expect, it, mock } from "bun:test"

const envDefaults = {
    NODE_ENV: "development",
    APP_ORIGIN: "http://app.example.test",
    AUTH_URL: "http://auth.example.test",
    API_URL: "https://api.example.test",
    LOGIN_URL: "http://login.example.test",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(envDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(envDefaults)) {
    process.env[key] = value
}

mock.module("@/shared/config/env.server", () => ({
    serverEnv: {
        NODE_ENV: "development",
        APP_ORIGIN: "http://app.example.test",
        AUTH_URL: "http://auth.example.test",
        API_URL: "https://api.example.test",
        LOGIN_URL: "http://login.example.test",
    },
}))

const {
    fetchOrganizationLayoutShowcaseServer,
    fetchOrganizationOgShowcaseServer,
    fetchOrganizationShowcaseServer,
} = await import("../organization-showcase.server")
const { getOrganizationUserRoleServer } = await import("../organization-role.server")

const originalFetch = globalThis.fetch
let fetchCalls: { url: string; init?: RequestInit }[] = []

function installFetch(...responses: Response[]) {
    const queue = [...responses]
    const mockedFetch = Object.assign(
        (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
            const url =
                input instanceof Request
                    ? input.url
                    : input instanceof URL
                      ? input.href
                      : input.toString()
            fetchCalls.push({ url, init })
            return Promise.resolve(queue.shift() ?? new Response(null, { status: 500 }))
        },
        { preconnect: originalFetch.preconnect }
    ) satisfies typeof fetch

    globalThis.fetch = mockedFetch
}

afterEach(() => {
    globalThis.fetch = originalFetch
    fetchCalls = []
})

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

describe("organization showcase server adapters", () => {
    it("fetches and parses the public showcase contract", async () => {
        installFetch(
            Response.json({
                success: true,
                data: {
                    organization: {
                        id: "org-1",
                        name: "Acme Freight",
                        slug: "acme",
                        logo: "https://cdn.example.test/logo.png",
                        tagline: "Cargo at pace",
                        overview: "Moving cargo across Europe.",
                        website: "https://acme.example.test",
                        brandColor: "#3183D8",
                        createdAt: "2026-05-11T00:00:00.000Z",
                        memberCount: 3,
                    },
                    services: [
                        {
                            id: "service-1",
                            name: "Road freight",
                            slug: "road-freight",
                            type: "transport",
                        },
                    ],
                    cargoTypes: [
                        {
                            id: "cargo-1",
                            name: "Pallets",
                            slug: "pallets",
                        },
                    ],
                },
            })
        )

        const data = await fetchOrganizationShowcaseServer("acme")

        expect(fetchCalls[0]?.url).toBe("https://api.example.test/api/organizations/acme/showcase")
        expect(data?.organization.id).toBe("org-1")
        expect(data?.services[0]?.name).toBe("Road freight")
        expect(data?.cargoTypes[0]?.slug).toBe("pallets")
    })

    it("returns null only for missing showcase responses", async () => {
        installFetch(Response.json({ success: false }, { status: 404 }))

        await expect(fetchOrganizationShowcaseServer("missing")).resolves.toBeNull()
    })

    it("throws when the public showcase contract is invalid", async () => {
        installFetch(
            Response.json({
                success: true,
                data: {
                    organization: {
                        id: "org-1",
                        name: "Acme Freight",
                        slug: "acme",
                        logo: null,
                        tagline: null,
                        overview: null,
                        website: null,
                        brandColor: "#0103B8",
                        createdAt: "2026-05-11T00:00:00.000Z",
                        memberCount: "3",
                    },
                    services: [],
                    cargoTypes: [],
                },
            })
        )

        await expect(fetchOrganizationShowcaseServer("invalid")).rejects.toThrow(
            'Invalid organization showcase response for "invalid"'
        )
    })

    it("normalizes layout showcase fields for route context", async () => {
        installFetch(
            Response.json({
                success: true,
                data: {
                    organization: {
                        id: "org-1",
                        name: "Acme Freight",
                    },
                },
            })
        )

        await expect(fetchOrganizationLayoutShowcaseServer("acme")).resolves.toEqual({
            id: "org-1",
            name: "Acme Freight",
            logo: null,
            brandColor: "#0103B8",
            font: "geist",
            tagline: null,
        })
    })

    it("returns the OG showcase projection", async () => {
        installFetch(
            Response.json({
                success: true,
                data: {
                    organization: {
                        name: "Acme Freight",
                        brandColor: "#FF66AD",
                    },
                },
            })
        )

        await expect(fetchOrganizationOgShowcaseServer("acme")).resolves.toEqual({
            name: "Acme Freight",
            brandColor: "#FF66AD",
        })
    })
})

describe("organization role server adapter", () => {
    it("fetches the current user's organization role with bearer auth", async () => {
        installFetch(
            Response.json({
                success: true,
                data: {
                    role: "ADMIN",
                },
            })
        )

        await expect(getOrganizationUserRoleServer("org-1", "token-123")).resolves.toBe("admin")
        expect(fetchCalls[0]?.url).toBe(
            "https://api.example.test/api/organizations/org-1/user/role"
        )
        expect(fetchCalls[0]?.init?.headers).toEqual({
            "Content-Type": "application/json",
            Authorization: "Bearer token-123",
        })
    })

    it("returns null when the backend does not provide a usable role", async () => {
        installFetch(
            Response.json({ success: false }, { status: 403 }),
            Response.json({ success: true, data: { role: "super-admin" } })
        )

        await expect(getOrganizationUserRoleServer("org-1", "token-123")).resolves.toBeNull()
        await expect(getOrganizationUserRoleServer("org-1", "token-123")).resolves.toBeNull()
    })
})
