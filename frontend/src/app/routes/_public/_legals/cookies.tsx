import { createFileRoute } from "@tanstack/react-router"
import { getCurrentOrigin } from "@/app/model/route-origin"
import { buildLegalStartHead } from "@/app/model/route-seo-head"
import { LegalCookiesPage } from "@/pages/legal-cookies"
import { defaultLanguage } from "@/shared/lib/i18n/marketing-languages"
import { LegalsLayoutShell } from "@/widgets/legal-public-layout"

export const Route = createFileRoute("/_public/_legals/cookies")({
    loader: () => ({ origin: getCurrentOrigin() }),
    head: ({ loaderData }) =>
        loaderData ? buildLegalStartHead({ page: "cookies", origin: loaderData.origin }) : {},
    component: LegalCookiesRoute,
})

function LegalCookiesRoute() {
    return (
        <LegalsLayoutShell navLang={defaultLanguage}>
            <LegalCookiesPage />
        </LegalsLayoutShell>
    )
}
