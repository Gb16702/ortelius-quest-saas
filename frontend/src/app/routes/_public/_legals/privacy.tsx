import { createFileRoute } from "@tanstack/react-router"
import { getCurrentOrigin } from "@/app/model/route-origin"
import { buildLegalStartHead } from "@/app/model/route-seo-head"
import { LegalPrivacyPage } from "@/pages/legal-privacy"
import { defaultLanguage } from "@/shared/lib/i18n/marketing-languages"
import { LegalsLayoutShell } from "@/widgets/legal-public-layout"

export const Route = createFileRoute("/_public/_legals/privacy")({
    loader: () => ({ origin: getCurrentOrigin() }),
    head: ({ loaderData }) =>
        loaderData ? buildLegalStartHead({ page: "privacy", origin: loaderData.origin }) : {},
    component: LegalPrivacyRoute,
})

function LegalPrivacyRoute() {
    return (
        <LegalsLayoutShell navLang={defaultLanguage}>
            <LegalPrivacyPage />
        </LegalsLayoutShell>
    )
}
