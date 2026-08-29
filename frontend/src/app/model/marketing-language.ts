import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type { MarketingPageKey } from "@/app/seo/marketing-pages"
import {
    getPreferredLanguage,
    isValidLanguage,
    type SupportedLanguage,
} from "@/shared/lib/i18n/marketing-languages"

type MarketingLanguageSource = "path" | "cookie" | "accept-language"

interface MarketingLanguageInput {
    page: MarketingPageKey
    pathLang?: string
}

interface MarketingLanguageResult {
    lang: SupportedLanguage
    source: MarketingLanguageSource
    redirectTo: string | null
}

export const resolveMarketingLanguageForRoute = createServerFn({ method: "GET" })
    .inputValidator((input: MarketingLanguageInput) => input)
    .handler(async ({ data }): Promise<MarketingLanguageResult> => {
        const [
            { getCookie, getRequestHeader, setCookie },
            { LANG_COOKIE_NAME, langCookieOptions },
        ] = await Promise.all([
            import("@tanstack/react-start/server"),
            import("@/shared/lib/i18n/lang-cookie.server"),
        ])

        if (isValidLanguage(data.pathLang)) {
            setCookie(LANG_COOKIE_NAME, data.pathLang, langCookieOptions)
            return { lang: data.pathLang, source: "path", redirectTo: null }
        }

        const cookieLang = getCookie(LANG_COOKIE_NAME)
        if (isValidLanguage(cookieLang)) {
            return {
                lang: cookieLang,
                source: "cookie",
                redirectTo: `/${cookieLang}/${data.page}`,
            }
        }

        const lang = getPreferredLanguage(getRequestHeader("accept-language"))
        return {
            lang,
            source: "accept-language",
            redirectTo: `/${lang}/${data.page}`,
        }
    })

export async function loadMarketingLanguage(
    page: MarketingPageKey,
    pathLang?: string,
    searchStr = ""
): Promise<SupportedLanguage> {
    const result = await resolveMarketingLanguageForRoute({ data: { page, pathLang } })

    if (result.redirectTo) {
        throw redirect({ href: `${result.redirectTo}${searchStr}`, replace: true })
    }

    return result.lang
}

export async function resolveMarketingHomePath(): Promise<string> {
    const { lang } = await resolveMarketingLanguageForRoute({ data: { page: "home" } })
    return `/${lang}/home`
}
