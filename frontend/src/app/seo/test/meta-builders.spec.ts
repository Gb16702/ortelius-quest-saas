import { afterAll, describe, expect, it } from "bun:test"

const publicEnvDefaults = {
    NODE_ENV: "development",
    VITE_API_URL: "https://api.example.test",
    VITE_PORTAL_ACCOUNT_URL: "https://portal.example.test",
    VITE_WS_URL: "wss://ws.example.test",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(publicEnvDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(publicEnvDefaults)) {
    process.env[key] = value
}

const { buildOrgAuthedMetaForRoute, buildOrgMetaForRoute, getOrgNameFromMatches } = await import(
    "../meta-builders"
)
const { buildOrgImageUrl } = await import("../organization-og-image")

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

type OrgMetaDescriptor = ReturnType<typeof buildOrgMetaForRoute>[number]
type OrgAuthedMetaDescriptor = ReturnType<typeof buildOrgAuthedMetaForRoute>[number]

function hasMetaProperty(
    entry: OrgMetaDescriptor,
    property: string
): entry is OrgMetaDescriptor & { property: string; content: string } {
    return (
        "property" in entry &&
        entry.property === property &&
        "content" in entry &&
        typeof entry.content === "string"
    )
}

describe("organization meta builders", () => {
    it("builds organization OG image URLs from the public API origin", () => {
        expect(
            buildOrgImageUrl({
                apiBaseUrl: "https://api.example.test/",
                slug: "acme",
                hash: "v123",
            })
        ).toBe("https://api.example.test/og/org/acme.png?v=v123")
    })

    it("emits og:image metadata for the backend OG endpoint", () => {
        const meta = buildOrgMetaForRoute({
            matches: [{ id: "root", data: { url: "https://app.example.test/org/acme" } }],
            slug: "acme",
            organization: {
                name: "Acme Freight",
                brandColor: "#FF66AD",
                tagline: "Cargo at pace",
                overview: "Moving freight across Europe.",
                logo: null,
                website: null,
            },
            services: [{ name: "Road freight" }],
            cargoTypes: [{ name: "Pallets" }],
        })

        const ogImage = meta.find((entry) => hasMetaProperty(entry, "og:image"))

        expect(ogImage?.content).toMatch(/^https:\/\/api\.example\.test\/og\/org\/acme\.png\?v=/)
    })

    it("builds private organization route titles from TanStack route context", () => {
        const meta = buildOrgAuthedMetaForRoute({
            origin: "https://app.example.test",
            sections: ["Conversations"],
            matches: [
                {
                    id: "/org/$slug",
                    context: {
                        orgLayoutData: {
                            org: { name: "Acme Freight" },
                        },
                    },
                },
            ],
        })

        expect(findTitle(meta)).toBe("Acme Freight › Conversations")
        expect(findMetaName(meta, "robots")).toBe("noindex, nofollow")
    })

    it("keeps the generic product title as fallback when organization context is unavailable", () => {
        expect(
            getOrgNameFromMatches([{ id: "/org/$slug", context: { orgLayoutData: null } }])
        ).toBeNull()

        const meta = buildOrgAuthedMetaForRoute({
            origin: "https://app.example.test",
            sections: ["Requests"],
            matches: [],
        })

        expect(findTitle(meta)).toBe("Ortelius Quest")
    })
})

function findTitle(meta: OrgAuthedMetaDescriptor[]): string | undefined {
    return meta.find((entry) => "title" in entry)?.title
}

function findMetaName(meta: OrgAuthedMetaDescriptor[], name: string): string | undefined {
    for (const entry of meta) {
        if ("name" in entry && entry.name === name && "content" in entry) {
            return entry.content
        }
    }
    return undefined
}
