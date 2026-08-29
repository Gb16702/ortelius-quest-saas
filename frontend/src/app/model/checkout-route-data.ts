import {
    type MarketingCurrentSubscription,
    marketingCurrentSubscriptionSchema,
} from "@/entities/subscription"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

export type MarketingCurrentSubscriptionRouteResult =
    | {
          status: "authenticated"
          subscription: MarketingCurrentSubscription
      }
    | {
          status: "unauthenticated"
      }

export async function fetchMarketingCurrentSubscriptionForRoute(): Promise<MarketingCurrentSubscriptionRouteResult> {
    const response = await fetch("/api/subscription/current", {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
        },
    })

    if (response.status === 401 || response.status === 403) {
        return { status: "unauthenticated" }
    }

    if (!response.ok) {
        throw new Error("Failed to fetch current subscription.")
    }

    return {
        status: "authenticated",
        subscription: parseSchema(
            marketingCurrentSubscriptionSchema,
            await readJsonResponse(response)
        ),
    }
}
