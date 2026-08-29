import { supportedLngs } from "@/shared/lib/i18n/marketing-languages"

const TECHNICAL_SEO_CACHE_CONTROL = "public, max-age=3600"
const ROBOTS_DISALLOW_PATHS = [
    "/api/",
    "/auth/",
    "/me/",
    "/og/",
    "/sign-in",
    "/invitation/",
    "/checkout",
    "/checkout-success",
] as const
const SITEMAP_MULTILINGUAL_PATHS = ["home", "pricing", "contact"] as const
const SITEMAP_MONOLINGUAL_PATHS = ["/privacy", "/terms", "/cookies"] as const
const DEFAULT_SITEMAP_LANGUAGE = "en"

export function buildRobotsTxt(origin: string): string {
    const robotsOrigin = new URL(origin).origin
    const disallow = ROBOTS_DISALLOW_PATHS.map((path) => `Disallow: ${path}`).join("\n")

    return `User-agent: *
${disallow}

Sitemap: ${robotsOrigin}/sitemap.xml
`
}

export function buildSitemapXml(origin: string): string {
    const sitemapOrigin = new URL(origin).origin
    const entries: string[] = []

    for (const slug of SITEMAP_MULTILINGUAL_PATHS) {
        entries.push(buildMultilingualEntry(sitemapOrigin, slug))
    }

    for (const path of SITEMAP_MONOLINGUAL_PATHS) {
        entries.push(buildMonolingualEntry(sitemapOrigin, path))
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`
}

export function buildRobotsResponse(origin: string): Response {
    return new Response(buildRobotsTxt(origin), {
        status: 200,
        headers: technicalSeoHeaders("text/plain; charset=utf-8"),
    })
}

export function buildSitemapResponse(origin: string): Response {
    return new Response(buildSitemapXml(origin), {
        status: 200,
        headers: technicalSeoHeaders("application/xml; charset=utf-8"),
    })
}

function buildMultilingualEntry(
    origin: string,
    slug: (typeof SITEMAP_MULTILINGUAL_PATHS)[number]
): string {
    const alternates = supportedLngs
        .map(
            (lang) =>
                `        <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(`${origin}/${lang}/${slug}`)}"/>`
        )
        .join("\n")
    const xDefault = `        <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}/${DEFAULT_SITEMAP_LANGUAGE}/${slug}`)}"/>`

    return supportedLngs
        .map((lang) => {
            const loc = `${origin}/${lang}/${slug}`
            return `    <url>
        <loc>${escapeXml(loc)}</loc>
${alternates}
${xDefault}
    </url>`
        })
        .join("\n")
}

function buildMonolingualEntry(origin: string, path: string): string {
    return `    <url>
        <loc>${escapeXml(`${origin}${path}`)}</loc>
    </url>`
}

function technicalSeoHeaders(contentType: string): Headers {
    return new Headers({
        "Cache-Control": TECHNICAL_SEO_CACHE_CONTROL,
        "Content-Type": contentType,
    })
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
}
