import type { SupportedLanguage } from "@/shared/lib/i18n/marketing"
import { supportedLngs } from "@/shared/lib/i18n/marketing-languages"
import { ogLocaleMap } from "./locale-map"
import { OG_IMAGE_PATH, OG_TYPE, SITE_NAME, TWITTER_CARD } from "./seo-defaults"

export type JsonLdMetaEntry = { "script:ld+json": Record<string, unknown> }

export type MetaEntry =
    | { title: string }
    | { name: string; content: string }
    | { property: string; content: string }
    | { tagName: "link"; rel: string; href: string; hrefLang?: string }

export type HeadEntry = MetaEntry | JsonLdMetaEntry

interface IndexableMetaInput {
    kind: "indexable"
    title: string
    description: string
    origin: string
    pathname: string
    locale: SupportedLanguage
    hreflang?: { lang: SupportedLanguage; pathname: string }[]
    xDefaultPathname?: string
}

interface NonIndexableMetaInput {
    kind: "auth" | "user-private" | "checkout"
    title: string
    description: string
    origin: string
    locale?: SupportedLanguage
}

interface OrgPublicMetaInput {
    kind: "org-public"
    title: string
    description: string
    origin: string
    pathname: string
    ogImageUrl: string
    indexable: boolean
    locale?: SupportedLanguage
}

export type BuildMetaInput = IndexableMetaInput | NonIndexableMetaInput | OrgPublicMetaInput

function buildAbsoluteUrl(origin: string, pathname: string): string {
    return new URL(pathname, origin).toString()
}

function buildIndexableMeta(input: IndexableMetaInput): MetaEntry[] {
    const { title, description, origin, pathname, locale, hreflang, xDefaultPathname } = input
    const url = buildAbsoluteUrl(origin, pathname)
    const image = buildAbsoluteUrl(origin, OG_IMAGE_PATH)

    const entries: MetaEntry[] = [
        { title },
        { name: "description", content: description },

        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: image },
        { property: "og:url", content: url },
        { property: "og:type", content: OG_TYPE },
        { property: "og:locale", content: ogLocaleMap[locale] },
        { property: "og:site_name", content: SITE_NAME },

        { name: "twitter:card", content: TWITTER_CARD },
        { name: "twitter:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },

        { tagName: "link", rel: "canonical", href: url },
    ]

    if (hreflang && hreflang.length > 0) {
        for (const alt of hreflang) {
            if (!supportedLngs.includes(alt.lang)) continue
            entries.push({
                tagName: "link",
                rel: "alternate",
                hrefLang: alt.lang,
                href: buildAbsoluteUrl(origin, alt.pathname),
            })
        }
        if (xDefaultPathname) {
            entries.push({
                tagName: "link",
                rel: "alternate",
                hrefLang: "x-default",
                href: buildAbsoluteUrl(origin, xDefaultPathname),
            })
        }
    }

    return entries
}

function buildNonIndexableMeta(input: NonIndexableMetaInput): MetaEntry[] {
    const { title, description, origin, locale } = input
    const rootUrl = buildAbsoluteUrl(origin, "/")
    const image = buildAbsoluteUrl(origin, OG_IMAGE_PATH)
    const ogLocale = locale ? ogLocaleMap[locale] : ogLocaleMap.en

    return [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, nofollow" },

        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: image },
        { property: "og:url", content: rootUrl },
        { property: "og:type", content: OG_TYPE },
        { property: "og:locale", content: ogLocale },
        { property: "og:site_name", content: SITE_NAME },

        { name: "twitter:card", content: TWITTER_CARD },
        { name: "twitter:url", content: rootUrl },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
    ]
}

function buildOrgPublicMeta(input: OrgPublicMetaInput): MetaEntry[] {
    const { title, description, origin, pathname, ogImageUrl, indexable, locale } = input
    const url = buildAbsoluteUrl(origin, pathname)
    const ogLocale = locale ? ogLocaleMap[locale] : ogLocaleMap.en

    const entries: MetaEntry[] = [
        { title },
        { name: "description", content: description },
        { name: "robots", content: indexable ? "index, follow" : "noindex, follow" },

        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImageUrl },
        { property: "og:url", content: url },
        { property: "og:type", content: OG_TYPE },
        { property: "og:locale", content: ogLocale },
        { property: "og:site_name", content: SITE_NAME },

        { name: "twitter:card", content: TWITTER_CARD },
        { name: "twitter:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImageUrl },
    ]

    if (indexable) {
        entries.push({ tagName: "link", rel: "canonical", href: url })
    }

    return entries
}

export function buildMeta(input: BuildMetaInput): MetaEntry[] {
    if (input.kind === "indexable") {
        return buildIndexableMeta(input)
    }
    if (input.kind === "org-public") {
        return buildOrgPublicMeta(input)
    }
    return buildNonIndexableMeta(input)
}
