import { type LegalPageKey, legalPages } from "@/app/seo/legal-pages"
import {
    getMarketingPageDescription,
    getMarketingPageTitle,
    type MarketingPageKey,
} from "@/app/seo/marketing-pages"
import { buildIndexableMetaForRoute, buildOrgAuthedMetaForRoute } from "@/app/seo/meta-builders"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing"
import { buildWebsiteJsonLd } from "@/shared/lib/seo/build-jsonld"
import type { HeadEntry } from "@/shared/lib/seo/build-meta"
import { getCurrentOrigin } from "./route-origin"

type StartMetaEntry =
    | { title: string }
    | { name: string; content: string }
    | { property: string; content: string }

interface StartLinkEntry {
    rel: string
    href: string
    hrefLang?: string
}

interface StartScriptEntry {
    type: string
    children: string
}

export interface StartRouteHead {
    meta: StartMetaEntry[]
    links: StartLinkEntry[]
    scripts: StartScriptEntry[]
}

export function convertHeadEntriesToStartHead(entries: HeadEntry[]): StartRouteHead {
    const meta: StartMetaEntry[] = []
    const links: StartLinkEntry[] = []
    const scripts: StartScriptEntry[] = []

    for (const entry of entries) {
        if ("script:ld+json" in entry) {
            scripts.push({
                type: "application/ld+json",
                children: serializeJsonLd(entry["script:ld+json"]),
            })
            continue
        }

        if ("tagName" in entry) {
            links.push({
                rel: entry.rel,
                href: entry.href,
                ...(entry.hrefLang ? { hrefLang: entry.hrefLang } : {}),
            })
            continue
        }

        if ("title" in entry) {
            meta.push({ title: entry.title })
            continue
        }

        if ("property" in entry) {
            meta.push({ property: entry.property, content: entry.content })
            continue
        }

        meta.push({ name: entry.name, content: entry.content })
    }

    return { meta, links, scripts }
}

interface MarketingHeadInput {
    page: MarketingPageKey
    lang: SupportedLanguage
    origin: string
}

export function buildMarketingStartHead({
    page,
    lang,
    origin,
}: MarketingHeadInput): StartRouteHead {
    const matches = buildOriginMatches(origin)
    const entries: HeadEntry[] = [
        ...buildIndexableMetaForRoute({
            matches,
            lang,
            pathname: (candidateLang) => `/${candidateLang}/${page}`,
            titleKey: `meta.${page}.title`,
            descriptionKey: `meta.${page}.description`,
            withHreflang: true,
        }),
        { name: "robots", content: "index, follow" },
    ]

    if (page === "home") {
        entries.push(buildWebsiteJsonLd({ origin }))
    }

    return convertHeadEntriesToStartHead(entries)
}

interface LegalHeadInput {
    page: LegalPageKey
    origin: string
}

export function buildLegalStartHead({ page, origin }: LegalHeadInput): StartRouteHead {
    const matches = buildOriginMatches(origin)
    const entries: HeadEntry[] = [
        ...buildIndexableMetaForRoute({
            matches,
            lang: "en",
            pathname: () => legalPages[page].pathname,
            titleKey: `meta.legals.${page}.title`,
            descriptionKey: `meta.legals.${page}.description`,
            withHreflang: false,
        }),
        { name: "robots", content: "index, follow" },
    ]

    return convertHeadEntriesToStartHead(entries)
}

interface OrgAuthedHeadInput {
    matches: readonly unknown[]
    sections: [string, ...string[]]
    lang?: SupportedLanguage
}

export function buildOrgAuthedStartHead({
    matches,
    sections,
    lang,
}: OrgAuthedHeadInput): StartRouteHead {
    return convertHeadEntriesToStartHead(
        buildOrgAuthedMetaForRoute({
            matches,
            sections,
            lang,
            origin: getCurrentOrigin(),
        })
    )
}

export function getMarketingPageSeoStrings(page: MarketingPageKey, lang: SupportedLanguage) {
    return {
        title: getMarketingPageTitle(page, lang),
        description: getMarketingPageDescription(page, lang),
    }
}

function buildOriginMatches(origin: string): [{ id: string; data: { url: string } }] {
    return [{ id: "start-root", data: { url: origin } }]
}

function serializeJsonLd(value: Record<string, unknown>): string {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
}
