import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { chatConversationsResponseSchema } from "../schemas/chats.schema"
import { createConversation, createTeamConversation } from "./conversation.factory"

describe("conversation factory contract", () => {
    it("parses inside the chat conversations response envelope", () => {
        expect(() =>
            parseSchema(chatConversationsResponseSchema, {
                data: { conversations: [createConversation()] },
            })
        ).not.toThrow()
    })

    it("accepts a team-chat conversation that requires organizationId", () => {
        expect(() =>
            parseSchema(chatConversationsResponseSchema, {
                data: { conversations: [createTeamConversation()] },
            })
        ).not.toThrow()
    })
})
