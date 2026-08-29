import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { buildPortalAuthUrl } from "@/app/model/auth-navigation"
import { fetchMarketingCurrentSubscriptionForRoute } from "@/app/model/checkout-route-data"
import { publicMarketingPlans } from "@/entities/subscription"
import { checkoutSearchSchema, createCheckoutSearchParams } from "@/features/marketing"
import { MarketingCheckoutPage } from "@/pages/marketing-checkout"
import { isValidLanguage } from "@/shared/lib/i18n/marketing-languages"

export const Route = createFileRoute("/_public/$lang/_checkout/checkout")({
    validateSearch: checkoutSearchSchema,
    loader: async ({ context, location, params }) => {
        if (!isValidLanguage(params.lang)) {
            throw notFound()
        }

        const subscriptionResult = await fetchMarketingCurrentSubscriptionForRoute()
        if (subscriptionResult.status === "unauthenticated") {
            const redirectPath = `${location.pathname}${location.searchStr}`

            throw redirect({
                href: import.meta.env.DEV
                    ? `/sign-in?redirect=${encodeURIComponent(redirectPath)}`
                    : buildPortalAuthUrl({
                          fallbackRedirect: redirectPath,
                          publicEnv: context.publicEnv,
                          requestOrigin: context.requestOrigin ?? "http://localhost",
                          search: { redirect: redirectPath },
                      }),
                replace: true,
            })
        }

        if (
            subscriptionResult.subscription.hasOrganization &&
            subscriptionResult.subscription.organization?.slug
        ) {
            throw redirect({
                href: `/org/${subscriptionResult.subscription.organization.slug}/dashboard`,
                replace: true,
            })
        }

        return {
            lang: params.lang,
            plans: publicMarketingPlans,
        }
    },
    component: CheckoutRoute,
})

function CheckoutRoute() {
    const navigate = Route.useNavigate()
    const { lang, plans } = Route.useLoaderData()
    const search = Route.useSearch()

    return (
        <MarketingCheckoutPage
            language={lang}
            onNavigate={(href) => {
                navigate({ href })
            }}
            plans={plans}
            searchParams={createCheckoutSearchParams(search)}
        />
    )
}
