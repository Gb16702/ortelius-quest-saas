import { useMemo, useState } from "react"
import type { Plan } from "@/entities/subscription"
import {
    findPlanByPriceId,
    resolveBillingIntervalForPrice,
    resolvePlanChangeDirection,
} from "../../lib/plan-selection"
import type { BillingInterval, PlanKey } from "../subscription"

interface UsePlanSelectionOptions {
    plans: readonly Plan[]
    currentPlanKey: PlanKey | null
    initialBillingInterval: BillingInterval
}

export function usePlanSelection({
    plans,
    currentPlanKey,
    initialBillingInterval,
}: UsePlanSelectionOptions) {
    const [billingInterval, setBillingInterval] = useState<BillingInterval>(initialBillingInterval)
    const [pendingPriceId, setPendingPriceId] = useState<string | null>(null)
    const [subscribePriceId, setSubscribePriceId] = useState<string | null>(null)

    const isSubscribing = !currentPlanKey

    const handleSelect = (priceId: string) => {
        if (isSubscribing) {
            setSubscribePriceId(priceId)
            return
        }

        setPendingPriceId(priceId)
    }

    const subscribePlan = useMemo(
        () => findPlanByPriceId(plans, subscribePriceId),
        [plans, subscribePriceId]
    )

    const subscribeInterval = useMemo(
        () => resolveBillingIntervalForPrice(subscribePlan, subscribePriceId),
        [subscribePlan, subscribePriceId]
    )

    const subscribePlanPrice =
        subscribePlan && subscribeInterval ? subscribePlan.prices[subscribeInterval] : null

    const pendingDirection = useMemo(
        () =>
            resolvePlanChangeDirection({
                plans,
                currentPlanKey,
                priceId: pendingPriceId,
            }),
        [plans, currentPlanKey, pendingPriceId]
    )

    return {
        billingInterval,
        setBillingInterval,
        pendingPriceId,
        setPendingPriceId,
        subscribePriceId,
        setSubscribePriceId,
        subscribePlan,
        subscribeInterval,
        subscribePlanPrice,
        pendingDirection,
        handleSelect,
    }
}
