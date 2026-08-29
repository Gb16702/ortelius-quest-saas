import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { currentSubscriptionSchema } from "../../model/current-subscription.schema"
import { plansResponseSchema } from "../../model/subscription.schema"
import { subscriptionHandlers } from "./subscription-handlers"

describe("subscription handlers contract", () => {
    setupMswServer(...subscriptionHandlers)

    it("returns an /api/subscription/current payload that parses through currentSubscriptionSchema (no envelope wrap)", async () => {
        const response = await fetch("http://localhost/api/subscription/current")
        const payload = await response.json()
        expect(() => parseSchema(currentSubscriptionSchema, payload)).not.toThrow()
    })

    it("returns an /api/onboarding/plans payload that parses through plansResponseSchema", async () => {
        const response = await fetch("http://localhost/api/onboarding/plans")
        const payload = await response.json()
        expect(() => parseSchema(plansResponseSchema, payload)).not.toThrow()
    })
})
