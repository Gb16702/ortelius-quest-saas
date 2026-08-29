import type * as v from "valibot"
import type { currentSubscriptionSchema } from "../current-subscription.schema"

type CurrentSubscriptionInput = v.InferInput<typeof currentSubscriptionSchema>

export function createCurrentSubscription(
    overrides: Partial<CurrentSubscriptionInput> = {}
): CurrentSubscriptionInput {
    return {
        plan: "professional",
        status: "active",
        pricePerSeat: 19,
        totalMonthlyPrice: 95,
        currentPriceId: "price_test_professional_monthly",
        nextBillingDate: "2026-06-15T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        cancelsAt: null,
        pendingPlanChange: null,
        trialEnd: null,
        hasUsedTrial: true,
        hasActiveSubscription: true,
        ...overrides,
    }
}
