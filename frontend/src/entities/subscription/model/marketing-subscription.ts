import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { type CurrentSubscription, marketingCurrentSubscriptionSchema } from "./subscription.schema"

export const emptyMarketingCurrentSubscription: CurrentSubscription = parseSchema(
    marketingCurrentSubscriptionSchema,
    {
        plan: null,
        status: null,
        hasUsedTrial: false,
        hasActiveSubscription: false,
        hasOrganization: false,
        organization: null,
    }
)
