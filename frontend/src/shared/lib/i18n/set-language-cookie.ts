import { createServerFn } from "@tanstack/react-start"
import { isValidLanguage } from "./marketing-languages"

export const setAppLanguageCookie = createServerFn({ method: "POST" })
    .inputValidator((input: { lang: string }) => input)
    .handler(async ({ data }) => {
        if (!isValidLanguage(data.lang)) {
            return { ok: false as const }
        }
        const [{ setCookie }, { LANG_COOKIE_NAME, langCookieOptions }] = await Promise.all([
            import("@tanstack/react-start/server"),
            import("./lang-cookie.server"),
        ])
        setCookie(LANG_COOKIE_NAME, data.lang, langCookieOptions)
        return { ok: true as const, lang: data.lang }
    })
