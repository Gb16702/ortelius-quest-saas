import type { Plan } from "@/entities/subscription"
import { useMarketingSession } from "@/widgets/marketing-layout"
import { useMarketingPricingData } from "../model/use-marketing-pricing-data"
import { PricingPageContent } from "./pricing/pricing-page-content"

interface MarketingPricingPageProps {
    plans?: Plan[]
}

export function MarketingPricingPage({ plans }: MarketingPricingPageProps) {
    const { lang, activeOrgSlug } = useMarketingSession()
    const { state } = useMarketingPricingData({ plans })

    return (
        <PricingPageContent
            activeOrgSlug={activeOrgSlug}
            lang={lang}
            plans={state.plans}
            subscriptionStatus={state.subscriptionStatus}
        />
    )
}
