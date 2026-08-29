import { createFileRoute } from "@tanstack/react-router"
import { getCurrentOrigin } from "@/app/model/route-origin"
import { buildLegalStartHead } from "@/app/model/route-seo-head"
import { LegalTermsPage } from "@/pages/legal-terms"
import { defaultLanguage } from "@/shared/lib/i18n/marketing-languages"
import { LegalsLayoutShell } from "@/widgets/legal-public-layout"

export const Route = createFileRoute("/_public/_legals/terms")({
    loader: () => ({ origin: getCurrentOrigin() }),
    head: ({ loaderData }) =>
        loaderData ? buildLegalStartHead({ page: "terms", origin: loaderData.origin }) : {},
    component: LegalTermsRoute,
})

function LegalTermsRoute() {
    return (
        <LegalsLayoutShell navLang={defaultLanguage}>
            <LegalTermsPage />
        </LegalsLayoutShell>
    )
}
