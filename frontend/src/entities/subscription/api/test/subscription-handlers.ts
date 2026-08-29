import { HttpResponse, http } from "msw"
import { createCurrentSubscription } from "../../model/test/current-subscription.factory"

export const subscriptionHandlers = [
    http.get("/api/subscription/current", () => HttpResponse.json(createCurrentSubscription())),
    http.get("/api/onboarding/plans", () => HttpResponse.json({ plans: [] })),
]
