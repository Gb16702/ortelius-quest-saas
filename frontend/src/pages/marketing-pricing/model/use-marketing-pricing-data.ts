import { useQuery } from "@tanstack/react-query"
import {
    emptyMarketingCurrentSubscription,
    fetchMarketingCurrentSubscription,
    type MarketingCurrentSubscription,
    marketingCurrentSubscriptionQueryKey,
    type Plan,
    publicMarketingPlans,
} from "@/entities/subscription"

interface UseMarketingPricingDataInput {
    plans?: Plan[]
}

interface MarketingPricingState {
    plans: Plan[]
    subscriptionStatus: MarketingCurrentSubscription
}

interface MarketingPricingData {
    state: MarketingPricingState
}

const MARKETING_SUBSCRIPTION_STALE_TIME_MS = 30 * 1000

export function useMarketingPricingData({
    plans,
}: UseMarketingPricingDataInput): MarketingPricingData {
    const isBrowser = typeof window !== "undefined"
    const subscriptionQuery = useQuery({
        queryKey: marketingCurrentSubscriptionQueryKey,
        queryFn: fetchMarketingCurrentSubscription,
        enabled: isBrowser,
        initialData: emptyMarketingCurrentSubscription,
        staleTime: MARKETING_SUBSCRIPTION_STALE_TIME_MS,
    })

    return {
        state: {
            plans: plans && plans.length > 0 ? plans : publicMarketingPlans,
            subscriptionStatus: subscriptionQuery.data ?? emptyMarketingCurrentSubscription,
        },
    }
}
