import { createFileRoute } from "@tanstack/react-router"
import { clearDevTokenCookies } from "@/features/auth/index.server"
import { buildCanonicalAppUrl } from "@/shared/config/app-origin.server"
import { serverEnv } from "@/shared/config/env.server"
import { getLangCookie } from "@/shared/lib/i18n/lang-cookie.server"
import { getPreferredLanguage } from "@/shared/lib/i18n/marketing-languages"

export const Route = createFileRoute("/_public/_auth/auth/logout")({
    server: {
        handlers: {
            GET: ({ request }) => {
                const headers = new Headers()
                clearDevTokenCookies(headers)

                if (serverEnv.NODE_ENV !== "production") {
                    headers.set("Location", "/sign-in")
                } else {
                    const lang =
                        getLangCookie(request) ??
                        getPreferredLanguage(request.headers.get("accept-language"))
                    const redirectUri = buildCanonicalAppUrl(`/${lang}/home`).toString()
                    headers.set(
                        "Location",
                        `${serverEnv.AUTH_URL}/auth/logout?redirect_uri=${encodeURIComponent(redirectUri)}`
                    )
                }

                return new Response(null, { headers, status: 302 })
            },
        },
    },
})
