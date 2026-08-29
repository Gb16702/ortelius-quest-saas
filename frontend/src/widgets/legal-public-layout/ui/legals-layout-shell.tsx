import { type ReactNode, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { syncMarketingLanguage } from "@/shared/lib/i18n/marketing"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing-languages"
import { useLegalHeaderSession } from "../model/use-legal-header-session"
import { LegalPublicFooter } from "./legal-public-footer"
import { LegalPublicHeader } from "./legal-public-header"

interface LegalsLayoutShellProps {
    navLang: SupportedLanguage
    children: ReactNode
}

export function LegalsLayoutShell({ navLang, children }: LegalsLayoutShellProps) {
    const { i18n } = useTranslation()
    const { session, activeOrgSlug } = useLegalHeaderSession()

    syncMarketingLanguage(navLang)

    useEffect(() => {
        if (i18n.language !== navLang) {
            i18n.changeLanguage(navLang)
        }
    }, [navLang, i18n])

    return (
        <div className="flex min-h-dvh flex-col bg-ds-surface" data-route="public-legal">
            <LegalPublicHeader
                navLang={navLang}
                session={session}
                activeOrgSlug={activeOrgSlug}
                headerBg="bg-ds-surface"
            />
            <main className="flex-1 pt-14 lg:pt-16">
                <div className="container mx-auto pd:px-0 px-8 pt-32 pb-16">{children}</div>
            </main>
            <LegalPublicFooter navLang={navLang} />
        </div>
    )
}
