import { describe, expect, it } from "bun:test"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    quoteMutationResponseSchema,
    requestMutationResponseSchema,
    shareToTeamChatResponseSchema,
} from "../schemas/request.schema"
import { sendRequestResponseSchema } from "../schemas/send-request.schema"

describe("request mutation response schemas", () => {
    it("requires explicit success for generic request mutations", () => {
        expect(safeParseSchema(requestMutationResponseSchema, { success: true }).success).toBe(true)
        expect(safeParseSchema(requestMutationResponseSchema, {}).success).toBe(false)
        expect(safeParseSchema(requestMutationResponseSchema, { success: false }).success).toBe(
            false
        )
    })

    it("requires explicit success for send-request mutations", () => {
        expect(safeParseSchema(sendRequestResponseSchema, { success: true }).success).toBe(true)
        expect(safeParseSchema(sendRequestResponseSchema, {}).success).toBe(false)
        expect(safeParseSchema(sendRequestResponseSchema, { success: false }).success).toBe(false)
    })

    it("requires the shared conversation id for team-chat sharing", () => {
        expect(
            safeParseSchema(shareToTeamChatResponseSchema, {
                success: true,
                data: { conversationId: "conversation-1" },
            }).success
        ).toBe(true)
        expect(safeParseSchema(shareToTeamChatResponseSchema, { success: true }).success).toBe(
            false
        )
        expect(
            safeParseSchema(shareToTeamChatResponseSchema, {
                success: true,
                data: {},
            }).success
        ).toBe(false)
    })

    it("requires explicit success for quote mutations", () => {
        expect(safeParseSchema(quoteMutationResponseSchema, { success: true }).success).toBe(true)
        expect(safeParseSchema(quoteMutationResponseSchema, {}).success).toBe(false)
        expect(safeParseSchema(quoteMutationResponseSchema, { success: false }).success).toBe(false)
    })
})
