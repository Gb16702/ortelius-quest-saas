import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { currentSubscriptionSchema } from "../current-subscription.schema"
import { createCurrentSubscription } from "./current-subscription.factory"

describe("current subscription factory contract", () => {
    it("produces an object that parses cleanly through currentSubscriptionSchema", () => {
        expect(() =>
            parseSchema(currentSubscriptionSchema, createCurrentSubscription())
        ).not.toThrow()
    })

    it("derives seats from pricePerSeat and totalMonthlyPrice", () => {
        const parsed = parseSchema(
            currentSubscriptionSchema,
            createCurrentSubscription({ pricePerSeat: 20, totalMonthlyPrice: 100 })
        )
        expect(parsed.seats).toBe(5)
    })
})
