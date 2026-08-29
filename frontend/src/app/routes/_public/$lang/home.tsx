import { createFileRoute } from "@tanstack/react-router"
import { loadMarketingLanguage } from "@/app/model/marketing-language"
import { getCurrentOrigin } from "@/app/model/route-origin"
import { buildMarketingStartHead } from "@/app/model/route-seo-head"
import { MarketingHomePage } from "@/pages/marketing-home"
import { MarketingLayoutShell } from "@/widgets/marketing-layout"

export const Route = createFileRoute("/_public/$lang/home")({
    loader: async ({ location, params }) => ({
        lang: await loadMarketingLanguage("home", params.lang, location.searchStr),
        origin: getCurrentOrigin(),
    }),
    head: ({ loaderData }) =>
        loaderData
            ? buildMarketingStartHead({
                  page: "home",
                  lang: loaderData.lang,
                  origin: loaderData.origin,
              })
            : {},
    component: MarketingHomeRoute,
})

function MarketingHomeRoute() {
    const { lang } = Route.useLoaderData()

    return (
        <MarketingLayoutShell lang={lang} pathname={`/${lang}/home`}>
            <MarketingHomePage />
        </MarketingLayoutShell>
    )
}
