import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { marketingCurrentSubscriptionSchema } from "../subscription.schema"
import { createMarketingSubscription } from "./marketing-subscription.factory"

describe("marketing subscription factory contract", () => {
    it("produces an object that parses cleanly through marketingCurrentSubscriptionSchema", () => {
        expect(() =>
            parseSchema(marketingCurrentSubscriptionSchema, createMarketingSubscription())
        ).not.toThrow()
    })
})
