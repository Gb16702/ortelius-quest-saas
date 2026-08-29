import { describe, expect, it } from "bun:test"

import { supportedLngs } from "@/shared/lib/i18n/marketing-languages"
import { buildRobotsTxt, buildSitemapXml } from "../technical-seo"

const ORIGIN = "https://app.example.test"

describe("technical SEO endpoints", () => {
    it("keeps robots rules and points to the canonical sitemap URL", () => {
        const robots = buildRobotsTxt(`${ORIGIN}/ignored-path?debug=true`)

        expect(robots).toContain("Disallow: /api/")
        expect(robots).toContain("Disallow: /me/")
        expect(robots).toContain("Disallow: /sign-in")
        expect(robots).toContain("Sitemap: https://app.example.test/sitemap.xml")
    })

    it("emits public marketing and legal URLs in the sitemap", () => {
        const sitemap = buildSitemapXml(`${ORIGIN}/ignored-path?debug=true`)

        for (const lang of supportedLngs) {
            expect(sitemap).toContain(`<loc>${ORIGIN}/${lang}/home</loc>`)
            expect(sitemap).toContain(`<loc>${ORIGIN}/${lang}/pricing</loc>`)
            expect(sitemap).toContain(`<loc>${ORIGIN}/${lang}/contact</loc>`)
            expect(sitemap).toContain(`hreflang="${lang}"`)
        }

        expect(sitemap).toContain(`hreflang="x-default"`)
        expect(sitemap).toContain(`<loc>${ORIGIN}/privacy</loc>`)
        expect(sitemap).toContain(`<loc>${ORIGIN}/terms</loc>`)
        expect(sitemap).toContain(`<loc>${ORIGIN}/cookies</loc>`)
    })
})
