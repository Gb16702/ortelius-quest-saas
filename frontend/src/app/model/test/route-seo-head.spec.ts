import { afterAll, describe, expect, it } from "bun:test"

const envDefaults = {
    API_URL: "https://api.example.test",
    APP_ORIGIN: "https://app.example.test",
    AUTH_URL: "https://auth.example.test",
    LOGIN_URL: "https://login.example.test",
    NODE_ENV: "development",
    VITE_API_URL: "https://api.example.test",
    VITE_PORTAL_ACCOUNT_URL: "https://portal.example.test",
    VITE_WS_URL: "wss://ws.example.test",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(envDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(envDefaults)) {
    process.env[key] = value
}

const { buildLegalStartHead, buildMarketingStartHead, buildOrgAuthedStartHead } = await import(
    "../route-seo-head"
)

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

interface StartHeadShape {
    meta: Array<{ title?: string; name?: string; property?: string; content?: string }>
    links: Array<{ rel: string; href: string; hrefLang?: string }>
    scripts: Array<{ type: string; children: string }>
}

describe("Start SEO head", () => {
    it("emits OG, Twitter, canonical, hreflang, robots, and website JSON-LD for marketing home", () => {
        const head = buildMarketingStartHead({
            page: "home",
            lang: "en",
            origin: "https://app.example.test",
        }) as StartHeadShape

        expect(findMetaProperty(head, "og:title")).toBe(
            "Ortelius Quest — Freight request management for logistics companies"
        )
        expect(findMetaName(head, "twitter:card")).toBe("summary_large_image")
        expect(findMetaName(head, "robots")).toBe("index, follow")
        expect(findLink(head, "canonical")?.href).toBe("https://app.example.test/en/home")
        expect(findAlternate(head, "fr")?.href).toBe("https://app.example.test/fr/home")
        expect(head.scripts.some((s) => s.type === "application/ld+json")).toBe(true)
    })

    it("emits hreflang on every supported language for marketing pricing", () => {
        const head = buildMarketingStartHead({
            page: "pricing",
            lang: "fr",
            origin: "https://app.example.test",
        }) as StartHeadShape

        expect(findLink(head, "canonical")?.href).toBe("https://app.example.test/fr/pricing")
        expect(findAlternate(head, "en")?.href).toBe("https://app.example.test/en/pricing")
        expect(findAlternate(head, "x-default")?.href).toBe("https://app.example.test/en/pricing")
    })

    it("keeps legal pages indexable, English-only, without hreflang", () => {
        const head = buildLegalStartHead({
            page: "privacy",
            origin: "https://app.example.test",
        }) as StartHeadShape

        expect(findMetaProperty(head, "og:title")).toBe("Privacy Policy — Ortelius Quest")
        expect(findMetaName(head, "robots")).toBe("index, follow")
        expect(findLink(head, "canonical")?.href).toBe("https://app.example.test/privacy")
        expect(head.links.some((l) => l.rel === "alternate")).toBe(false)
    })

    it("emits private organization titles from route context", () => {
        const head = buildOrgAuthedStartHead({
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
            sections: ["Settings", "Billing"],
        })

        expect(findTitle(head)).toBe("Acme Freight › Settings › Billing")
        expect(findMetaName(head, "robots")).toBe("noindex, nofollow")
    })
})

function findMetaProperty(head: StartHeadShape, property: string): string | undefined {
    return head.meta.find((entry) => entry.property === property)?.content
}

function findMetaName(head: StartHeadShape, name: string): string | undefined {
    return head.meta.find((entry) => entry.name === name)?.content
}

function findTitle(head: StartHeadShape): string | undefined {
    return head.meta.find((entry) => entry.title)?.title
}

function findLink(
    head: StartHeadShape,
    rel: string
): { rel: string; href: string; hrefLang?: string } | undefined {
    return head.links.find((entry) => entry.rel === rel && !entry.hrefLang)
}

function findAlternate(
    head: StartHeadShape,
    hrefLang: string
): { rel: string; href: string; hrefLang?: string } | undefined {
    return head.links.find((entry) => entry.rel === "alternate" && entry.hrefLang === hrefLang)
}
