import i18next from "i18next"

import { isOrganizationPublishable } from "@/entities/organization"
import "@/shared/lib/i18n/marketing"
import { publicEnv } from "@/shared/config/env"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing"
import { supportedLngs } from "@/shared/lib/i18n/marketing-languages"
import { buildOrganizationJsonLd, buildOrgJsonLd } from "@/shared/lib/seo/build-jsonld"
import { buildMeta } from "@/shared/lib/seo/build-meta"
import { getOriginFromMatches } from "@/shared/lib/seo/origin"
import { buildOrgImageHash, buildOrgImageUrl } from "./organization-og-image"

type MatchLike = { id: string; data: unknown } | undefined
type RouteMatchLike = unknown

interface IndexableInput {
    matches: readonly MatchLike[]
    lang: SupportedLanguage
    pathname: (lang: SupportedLanguage) => string
    titleKey: string
    descriptionKey: string
    withHreflang: boolean
}

export function buildIndexableMetaForRoute(input: IndexableInput) {
    const { matches, lang, pathname, titleKey, descriptionKey, withHreflang } = input
    const origin = getOriginFromMatches(matches)
    const t = i18next.getFixedT(lang, "translation")
    return [
        ...buildMeta({
            kind: "indexable",
            title: t(titleKey),
            description: t(descriptionKey),
            origin,
            pathname: pathname(lang),
            locale: lang,
            hreflang: withHreflang
                ? supportedLngs.map((l) => ({ lang: l, pathname: pathname(l) }))
                : undefined,
            xDefaultPathname: withHreflang ? pathname("en") : undefined,
        }),
        buildOrganizationJsonLd({ origin, description: t("meta.organizationDescription") }),
    ]
}

interface NonIndexableInput {
    matches: readonly MatchLike[]
    kind: "auth" | "user-private" | "checkout"
    lang?: SupportedLanguage
    title?: string
}

export function buildNonIndexableMetaForRoute(input: NonIndexableInput) {
    const { matches, kind, lang = "en", title } = input
    const origin = getOriginFromMatches(matches)
    const t = i18next.getFixedT(lang, "translation")
    return buildMeta({
        kind,
        title: title ?? t("meta.generic.title"),
        description: t("meta.generic.description"),
        origin,
        locale: lang,
    })
}

interface OrgAuthedMetaInput {
    matches: readonly RouteMatchLike[]
    sections: [string, ...string[]]
    lang?: SupportedLanguage
    origin?: string
}

export function buildOrgAuthedMetaForRoute(input: OrgAuthedMetaInput) {
    const orgName = getOrgNameFromMatches(input.matches)
    const path = input.sections.join(" › ")
    const title = orgName ? `${orgName} › ${path}` : undefined
    return buildNonIndexableMetaForRoute({
        matches: input.origin ? buildOriginMatches(input.origin) : getSeoMatches(input.matches),
        kind: "user-private",
        lang: input.lang,
        title,
    })
}

export function getOrgNameFromMatches(matches: readonly RouteMatchLike[]): string | null {
    for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i]
        const name =
            readOrgNameFromMatchSlot(match, "context") ??
            readOrgNameFromMatchSlot(match, "loaderData") ??
            readOrgNameFromMatchSlot(match, "data")
        if (name) return name
    }
    return null
}

function readOrgNameFromMatchSlot(match: unknown, key: "context" | "loaderData" | "data") {
    if (!isRecord(match) || !(key in match)) return null
    return readOrgName(match[key])
}

function readOrgName(value: unknown): string | null {
    if (!isRecord(value)) return null

    const orgLayoutData = value.orgLayoutData
    if (isRecord(orgLayoutData)) {
        const name = readOrgName(orgLayoutData)
        if (name) return name
    }

    const activeOrganization = value.activeOrganization
    if (isRecord(activeOrganization)) {
        const name = readName(activeOrganization)
        if (name) return name
    }

    const org = value.org
    if (isRecord(org)) {
        const name = readName(org)
        if (name) return name
    }

    return readName(value)
}

function readName(value: Record<string, unknown>): string | null {
    return typeof value.name === "string" && value.name.trim().length > 0 ? value.name : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function getSeoMatches(matches: readonly RouteMatchLike[]): MatchLike[] {
    return matches.filter(
        (match): match is Exclude<MatchLike, undefined> =>
            isRecord(match) && typeof match.id === "string" && "data" in match
    )
}

function buildOriginMatches(origin: string): [{ id: string; data: { url: string } }] {
    return [{ id: "start-root", data: { url: origin } }]
}

interface OrgMetaInput {
    matches: readonly MatchLike[]
    slug: string
    organization: {
        name: string
        brandColor: string | null
        tagline: string | null
        overview: string | null
        logo: string | null
        website: string | null
    }
    services: { name: string }[]
    cargoTypes: { name: string }[]
    lang?: SupportedLanguage
}

const ORG_DESCRIPTION_FALLBACK = "Freight forwarder profile on Ortelius Quest"

function pickOrgDescription(tagline: string | null, overview: string | null): string {
    const raw = (tagline?.trim() || overview?.trim() || "").replace(/\s+/g, " ")
    const candidate = raw || ORG_DESCRIPTION_FALLBACK
    if (candidate.length <= 200) return candidate
    return `${candidate.slice(0, 197).trimEnd()}…`
}

export function buildOrgMetaForRoute(input: OrgMetaInput) {
    const { matches, slug, organization, services, cargoTypes, lang = "en" } = input
    const origin = getOriginFromMatches(matches)
    const pathname = `/org/${slug}`
    const indexable = isOrganizationPublishable({
        tagline: organization.tagline,
        overview: organization.overview,
        servicesCount: services.length,
        cargoTypesCount: cargoTypes.length,
    })
    const hash = buildOrgImageHash({
        name: organization.name,
        brandColor: organization.brandColor,
    })
    const ogImageUrl = buildOrgImageUrl({ apiBaseUrl: getPublicApiUrl(), slug, hash })
    const description = pickOrgDescription(organization.tagline, organization.overview)
    const title = organization.name

    const meta = buildMeta({
        kind: "org-public",
        title,
        description,
        origin,
        pathname,
        ogImageUrl,
        indexable,
        locale: lang,
    })

    if (!indexable) return meta

    return [
        ...meta,
        buildOrgJsonLd({
            origin,
            pathname,
            name: organization.name,
            description,
            logo: organization.logo,
            website: organization.website,
            serviceTypes: services.map((s) => s.name).filter(Boolean),
            knowsAbout: cargoTypes.map((c) => c.name).filter(Boolean),
            ogImageUrl,
        }),
    ]
}

function getPublicApiUrl(): string {
    if (typeof process !== "undefined" && process.env.VITE_API_URL) {
        return process.env.VITE_API_URL
    }

    return publicEnv.API_URL
}
