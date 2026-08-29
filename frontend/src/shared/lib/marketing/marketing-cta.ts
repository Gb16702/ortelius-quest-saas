export type MarketingCta =
    | { labelKey: string; fallback: string; kind: "open-org"; lang: string; slug: string }
    | { labelKey: string; fallback: string; kind: "open-app"; lang: string }
    | { labelKey: string; fallback: string; kind: "try-for-free"; lang: string }

export interface MarketingCtaInput {
    lang: string
    isAuthenticated: boolean
    activeOrgSlug: string | null
}

export function getMarketingCta({
    lang,
    isAuthenticated,
    activeOrgSlug,
}: MarketingCtaInput): MarketingCta {
    if (activeOrgSlug) {
        return {
            kind: "open-org",
            lang,
            slug: activeOrgSlug,
            labelKey: "nav.openApp",
            fallback: "Open app",
        }
    }

    if (isAuthenticated) {
        return {
            kind: "open-app",
            lang,
            labelKey: "nav.openApp",
            fallback: "Open app",
        }
    }

    return {
        kind: "try-for-free",
        lang,
        labelKey: "nav.tryForFree",
        fallback: "Try for free",
    }
}
