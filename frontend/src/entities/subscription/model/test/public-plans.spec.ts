import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { publicMarketingPlanOrder, publicMarketingPlans } from "../public-plans"
import { plansResponseSchema } from "../subscription.schema"

describe("public marketing plans", () => {
    it("stay aligned with the public plan contract", () => {
        expect(() =>
            parseSchema(plansResponseSchema, { plans: publicMarketingPlans })
        ).not.toThrow()
        expect(publicMarketingPlans.map((plan) => plan.name)).toEqual(publicMarketingPlanOrder)
    })

    it("exposes pricing without a runtime backend fetch", () => {
        expect(publicMarketingPlans.map((plan) => plan.prices.monthly.amount)).toEqual([
            25, 75, 150,
        ])
        expect(publicMarketingPlans.every((plan) => plan.freeTrial.days === 14)).toBe(true)
    })
})
