import { createFileRoute } from "@tanstack/react-router"
import { loadMarketingLanguage } from "@/app/model/marketing-language"
import { getCurrentOrigin } from "@/app/model/route-origin"
import { buildMarketingStartHead } from "@/app/model/route-seo-head"
import { MarketingPricingPage } from "@/pages/marketing-pricing"
import { MarketingLayoutShell } from "@/widgets/marketing-layout"

export const Route = createFileRoute("/_public/$lang/pricing")({
    loader: async ({ location, params }) => ({
        lang: await loadMarketingLanguage("pricing", params.lang, location.searchStr),
        origin: getCurrentOrigin(),
    }),
    head: ({ loaderData }) =>
        loaderData
            ? buildMarketingStartHead({
                  page: "pricing",
                  lang: loaderData.lang,
                  origin: loaderData.origin,
              })
            : {},
    component: MarketingPricingRoute,
})

function MarketingPricingRoute() {
    const { lang } = Route.useLoaderData()

    return (
        <MarketingLayoutShell lang={lang} pathname={`/${lang}/pricing`}>
            <MarketingPricingPage />
        </MarketingLayoutShell>
    )
}
