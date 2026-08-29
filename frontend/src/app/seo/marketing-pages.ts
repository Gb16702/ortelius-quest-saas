import i18n from "i18next"
import {
    defaultLanguage,
    isValidLanguage,
    type SupportedLanguage,
    supportedLngs,
} from "../../shared/lib/i18n/marketing"

export const marketingPageKeys = ["home", "pricing", "contact"] as const

export type MarketingPageKey = (typeof marketingPageKeys)[number]

export function getMarketingPagePrerenderPaths(page: MarketingPageKey): string[] {
    return supportedLngs.map((lang) => `/${lang}/${page}`)
}

export function parseMarketingLanguage(rawLang: string | undefined): SupportedLanguage {
    return isValidLanguage(rawLang) ? rawLang : defaultLanguage
}

export function getMarketingPageTitle(page: MarketingPageKey, lang: SupportedLanguage): string {
    return i18n.getFixedT(lang)(`meta.${page}.title`)
}

export function getMarketingPageDescription(
    page: MarketingPageKey,
    lang: SupportedLanguage
): string {
    return i18n.getFixedT(lang)(`meta.${page}.description`)
}
