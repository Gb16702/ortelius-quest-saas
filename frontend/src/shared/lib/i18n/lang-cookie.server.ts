import { parse, serialize } from "cookie"
import { serverEnv } from "@/shared/config/env.server"
import { isValidLanguage, type SupportedLanguage } from "@/shared/lib/i18n/marketing-languages"

export const LANG_COOKIE_NAME = "lang_pref"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365
export const langCookieOptions = {
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
} as const

export function getLangCookie(request: Request): SupportedLanguage | null {
    const header = request.headers.get("Cookie")
    if (!header) return null
    const value = parse(header)[LANG_COOKIE_NAME]
    return isValidLanguage(value) ? value : null
}

export function serializeLangCookie(lang: SupportedLanguage): string {
    return serialize(LANG_COOKIE_NAME, lang, langCookieOptions)
}
