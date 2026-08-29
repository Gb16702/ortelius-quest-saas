import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type { User } from "@/entities/session"
import { changeAppLanguage, ensureAppLanguageResources } from "@/shared/lib/i18n/marketing"
import {
    defaultLanguage,
    getPreferredLanguage,
    isValidLanguage,
    type SupportedLanguage,
} from "@/shared/lib/i18n/marketing-languages"

type AppLanguageSource = "profile" | "path" | "cookie" | "accept-language" | "default"

interface AppLanguageResult {
    lang: SupportedLanguage
    source: AppLanguageSource
}

interface PublicAppLanguageInput {
    fallbackPathWithoutLang: string
    pathLang?: string
}

interface PublicAppLanguageResult extends AppLanguageResult {
    redirectTo: string | null
}

export function getUserProfileLanguage(user: User | null | undefined): SupportedLanguage | null {
    const language = user?.profile?.language
    return typeof language === "string" && isValidLanguage(language) ? language : null
}

export const resolveAppLanguageFallback = createServerFn({ method: "GET" }).handler(
    async (): Promise<AppLanguageResult> => {
        const [{ getCookie, getRequestHeader }, { LANG_COOKIE_NAME }] = await Promise.all([
            import("@tanstack/react-start/server"),
            import("@/shared/lib/i18n/lang-cookie.server"),
        ])

        const cookieLang = getCookie(LANG_COOKIE_NAME)
        if (isValidLanguage(cookieLang)) {
            return { lang: cookieLang, source: "cookie" }
        }

        const acceptLanguage = getRequestHeader("accept-language")
        if (acceptLanguage) {
            return {
                lang: getPreferredLanguage(acceptLanguage),
                source: "accept-language",
            }
        }

        return { lang: defaultLanguage, source: "default" }
    }
)

export const resolvePublicAppLanguageForRoute = createServerFn({ method: "GET" })
    .inputValidator((input: PublicAppLanguageInput) => input)
    .handler(async ({ data }): Promise<PublicAppLanguageResult> => {
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
                redirectTo: `/${cookieLang}${data.fallbackPathWithoutLang}`,
            }
        }

        const lang = getPreferredLanguage(getRequestHeader("accept-language"))
        return {
            lang,
            source: "accept-language",
            redirectTo: `/${lang}${data.fallbackPathWithoutLang}`,
        }
    })

export async function loadPublicAppLanguage(
    pathLang: string | undefined,
    fallbackPathWithoutLang: string,
    searchStr = ""
): Promise<SupportedLanguage> {
    const result = await resolvePublicAppLanguageForRoute({
        data: { pathLang, fallbackPathWithoutLang },
    })

    if (result.redirectTo) {
        throw redirect({ href: `${result.redirectTo}${searchStr}`, replace: true })
    }

    return result.lang
}

export async function resolvePrivateAppLanguage(user: User): Promise<SupportedLanguage> {
    const profileLanguage = getUserProfileLanguage(user)
    if (profileLanguage) return profileLanguage

    const fallback = await resolveAppLanguageFallback()
    return fallback.lang
}

export async function loadPrivateAppLanguage(user: User): Promise<SupportedLanguage> {
    const lang = await resolvePrivateAppLanguage(user)

    if (typeof window === "undefined") {
        await ensureAppLanguageResources(lang)
    } else {
        await changeAppLanguage(lang)
    }

    return lang
}

export { setAppLanguageCookie } from "@/shared/lib/i18n/set-language-cookie"
