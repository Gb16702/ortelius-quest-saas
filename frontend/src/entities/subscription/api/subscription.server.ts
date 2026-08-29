import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    type CurrentSubscription,
    marketingCurrentSubscriptionSchema,
    type PlansResponse,
    plansResponseSchema,
} from "../model/subscription.schema"

const API_URL = serverEnv.API_URL

const EMPTY_SUBSCRIPTION: CurrentSubscription = {
    plan: null,
    status: null,
    hasUsedTrial: false,
    hasActiveSubscription: false,
    hasOrganization: false,
    organization: null,
}

export async function getPlans(): Promise<PlansResponse> {
    const response = await fetch(`${API_URL}/api/onboarding/plans`)
    if (!response.ok) {
        throw new Error(`Failed to fetch plans: ${response.statusText}`)
    }
    return parseSchema(plansResponseSchema, await readJsonResponse(response))
}

export async function getCurrentSubscription(cookie?: string | null): Promise<CurrentSubscription> {
    if (!cookie) return EMPTY_SUBSCRIPTION

    try {
        const response = await fetch(`${API_URL}/api/subscription/current`, {
            headers: { cookie },
        })
        if (!response.ok) return EMPTY_SUBSCRIPTION
        return parseSchema(marketingCurrentSubscriptionSchema, await readJsonResponse(response))
    } catch {
        return EMPTY_SUBSCRIPTION
    }
}
