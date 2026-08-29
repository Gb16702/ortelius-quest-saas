import { type ReactNode, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { usePublicAuthHint } from "@/features/auth"
import {
    type SupportedLanguage,
    supportedLngs,
    syncMarketingLanguage,
} from "@/shared/lib/i18n/marketing"
import { MarketingSessionProvider } from "../model/marketing-session.context"
import { MarketingFooter } from "./marketing-footer"
import { MarketingHeader } from "./marketing-header"

interface MarketingLayoutShellProps {
    lang: SupportedLanguage
    pathname: string
    children: ReactNode
}

function getRouteWithoutLang(pathname: string): string {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length > 0 && supportedLngs.includes(segments[0] as SupportedLanguage)) {
        return `/${segments.slice(1).join("/")}` || "/"
    }
    return pathname
}

function getHeaderBg(route: string): string {
    if (route === "/contact") {
        return "bg-ds-canvas"
    }
    return "bg-ds-surface"
}

export function MarketingLayoutShell({ lang, pathname, children }: MarketingLayoutShellProps) {
    const { i18n } = useTranslation()
    const { session, activeOrgSlug } = usePublicAuthHint()
    const routeWithoutLang = getRouteWithoutLang(pathname)
    const headerBg = getHeaderBg(routeWithoutLang)

    syncMarketingLanguage(lang)

    useEffect(() => {
        if (i18n.language !== lang) {
            i18n.changeLanguage(lang)
        }
    }, [lang, i18n])

    return (
        <MarketingSessionProvider value={{ lang, session, activeOrgSlug }}>
            <div className="flex min-h-dvh flex-col bg-ds-surface" data-route={routeWithoutLang}>
                <MarketingHeader
                    lang={lang}
                    session={session}
                    activeOrgSlug={activeOrgSlug}
                    headerBg={headerBg}
                />
                <main className="flex-1 pt-14 lg:pt-16">{children}</main>
                <MarketingFooter lang={lang} />
            </div>
        </MarketingSessionProvider>
    )
}
