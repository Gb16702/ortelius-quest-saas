import { createFileRoute, notFound } from "@tanstack/react-router"
import { checkoutSuccessSearchSchema } from "@/features/marketing"
import { MarketingCheckoutSuccessPage } from "@/pages/marketing-checkout-success"
import { isValidLanguage } from "@/shared/lib/i18n/marketing-languages"

export const Route = createFileRoute("/_public/$lang/_checkout/checkout-success")({
    validateSearch: checkoutSuccessSearchSchema,
    beforeLoad: ({ params }) => {
        if (!isValidLanguage(params.lang)) {
            throw notFound()
        }
    },
    component: CheckoutSuccessRoute,
})

function CheckoutSuccessRoute() {
    const { requestOrigin } = Route.useRouteContext()
    const { lang } = Route.useParams()
    const search = Route.useSearch()

    return (
        <MarketingCheckoutSuccessPage
            language={lang}
            requestOrigin={requestOrigin}
            search={search}
        />
    )
}
