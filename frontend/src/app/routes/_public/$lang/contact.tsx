import { createFileRoute } from "@tanstack/react-router"
import { loadMarketingLanguage } from "@/app/model/marketing-language"
import { getCurrentOrigin } from "@/app/model/route-origin"
import { buildMarketingStartHead } from "@/app/model/route-seo-head"
import { MarketingContactPage } from "@/pages/marketing-contact"
import { MarketingLayoutShell } from "@/widgets/marketing-layout"

export const Route = createFileRoute("/_public/$lang/contact")({
    loader: async ({ location, params }) => ({
        lang: await loadMarketingLanguage("contact", params.lang, location.searchStr),
        origin: getCurrentOrigin(),
    }),
    head: ({ loaderData }) =>
        loaderData
            ? buildMarketingStartHead({
                  page: "contact",
                  lang: loaderData.lang,
                  origin: loaderData.origin,
              })
            : {},
    component: MarketingContactRoute,
})

function MarketingContactRoute() {
    const { lang } = Route.useLoaderData()

    return (
        <MarketingLayoutShell lang={lang} pathname={`/${lang}/contact`}>
            <MarketingContactPage />
        </MarketingLayoutShell>
    )
}
