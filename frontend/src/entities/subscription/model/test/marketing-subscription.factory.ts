import type * as v from "valibot"
import { TEST_ORG_ID, TEST_ORG_NAME, TEST_ORG_SLUG } from "@/shared/test/fixtures/identity"
import type { marketingCurrentSubscriptionSchema } from "../subscription.schema"

type MarketingSubscriptionInput = v.InferInput<typeof marketingCurrentSubscriptionSchema>

export function createMarketingSubscription(
    overrides: Partial<MarketingSubscriptionInput> = {}
): MarketingSubscriptionInput {
    return {
        plan: "professional",
        status: "active",
        hasUsedTrial: true,
        hasActiveSubscription: true,
        hasOrganization: true,
        organization: {
            id: TEST_ORG_ID,
            name: TEST_ORG_NAME,
            slug: TEST_ORG_SLUG,
            status: "active",
        },
        ...overrides,
    }
}
