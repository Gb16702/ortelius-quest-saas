export const supportedLngs = ["en", "fr", "es", "nl", "vi"] as const

export type SupportedLanguage = (typeof supportedLngs)[number]

export const supportedLanguages = {
    en: { name: "English" },
    fr: { name: "Français" },
    es: { name: "Español" },
    nl: { name: "Nederlands" },
    vi: { name: "Tiếng Việt" },
} satisfies Record<SupportedLanguage, { name: string }>

const supportedLanguageCodes = new Set<string>(supportedLngs)

export const defaultLanguage: SupportedLanguage = "en"

export function isValidLanguage(lang: string | undefined): lang is SupportedLanguage {
    return !!lang && supportedLanguageCodes.has(lang)
}

export function getLanguageFromPath(pathname: string): SupportedLanguage {
    const segments = pathname.split("/").filter(Boolean)
    const lang = segments[0]
    return isValidLanguage(lang) ? lang : defaultLanguage
}

export function getPreferredLanguage(acceptLanguage?: string | null): SupportedLanguage {
    if (!acceptLanguage) return defaultLanguage

    const languages = acceptLanguage
        .split(",")
        .map((entry, index) => {
            const [tag, ...params] = entry.split(";")
            const qParam = params.find((param) => param.trim().startsWith("q="))
            const qValue = qParam ? Number(qParam.trim().slice(2)) : 1

            return {
                lang: tag.trim().split("-")[0],
                quality: Number.isFinite(qValue) ? qValue : 0,
                index,
            }
        })
        .sort((a, b) => b.quality - a.quality || a.index - b.index)

    for (const { lang, quality } of languages) {
        if (quality <= 0) continue
        if (isValidLanguage(lang)) {
            return lang
        }
    }

    return defaultLanguage
}
