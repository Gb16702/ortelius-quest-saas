import { OG_IMAGE_PATH, SITE_NAME } from "./seo-defaults"

interface OrganizationJsonLdInput {
    origin: string
    description: string
}

export function buildOrganizationJsonLd({ origin, description }: OrganizationJsonLdInput) {
    return {
        "script:ld+json": {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: new URL("/", origin).toString(),
            logo: new URL(OG_IMAGE_PATH, origin).toString(),
            description,
        },
    } as const
}

interface WebsiteJsonLdInput {
    origin: string
}

export function buildWebsiteJsonLd({ origin }: WebsiteJsonLdInput) {
    return {
        "script:ld+json": {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: new URL("/", origin).toString(),
        },
    } as const
}

interface OrgJsonLdInput {
    origin: string
    pathname: string
    name: string
    description: string
    logo?: string | null
    website?: string | null
    serviceTypes: string[]
    knowsAbout: string[]
    ogImageUrl: string
}

export function buildOrgJsonLd({
    origin,
    pathname,
    name,
    description,
    logo,
    website,
    serviceTypes,
    knowsAbout,
    ogImageUrl,
}: OrgJsonLdInput) {
    const pageUrl = new URL(pathname, origin).toString()
    const payload: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name,
        description,
        url: pageUrl,
        image: ogImageUrl,
    }
    if (logo) payload.logo = logo
    if (website) payload.sameAs = [website]
    if (serviceTypes.length > 0) payload.serviceType = serviceTypes
    if (knowsAbout.length > 0) payload.knowsAbout = knowsAbout
    return { "script:ld+json": payload }
}
