import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { emptyMarketingCurrentSubscription } from "../model/marketing-subscription"
import {
    type CurrentSubscription,
    marketingCurrentSubscriptionSchema,
} from "../model/subscription.schema"

export async function fetchMarketingCurrentSubscription(): Promise<CurrentSubscription> {
    try {
        const response = await fetch("/api/subscription/current", {
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
            },
        })

        if (!response.ok) return emptyMarketingCurrentSubscription
        return parseSchema(marketingCurrentSubscriptionSchema, await readJsonResponse(response))
    } catch {
        return emptyMarketingCurrentSubscription
    }
}
