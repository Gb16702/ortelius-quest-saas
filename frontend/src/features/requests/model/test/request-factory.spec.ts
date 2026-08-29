import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { organizationRequestListItemSchema } from "../schemas/request.schema"
import { createRequest } from "./request.factory"

describe("request factory contract", () => {
    it("produces an object that parses cleanly through organizationRequestListItemSchema", () => {
        expect(() => parseSchema(organizationRequestListItemSchema, createRequest())).not.toThrow()
    })

    it("accepts every lifecycle status enum value", () => {
        const lifecycleStatuses = ["draft", "open", "quoted", "invoiced", "closed"] as const
        for (const lifecycleStatus of lifecycleStatuses) {
            expect(() =>
                parseSchema(
                    organizationRequestListItemSchema,
                    createRequest({
                        lifecycleStatus,
                        closedReason: lifecycleStatus === "closed" ? "request_rejected" : null,
                    })
                )
            ).not.toThrow()
        }
    })
})
