import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import {
    chatConversationsResponseSchema,
    chatMessageMutationResponseSchema,
    chatMessagesPageResponseSchema,
} from "../../model/schemas/chats.schema"
import { chatHandlers } from "./chat-handlers"

describe("chat handlers contract", () => {
    setupMswServer(...chatHandlers)

    it("returns an /api/conversations payload that parses through chatConversationsResponseSchema", async () => {
        const response = await fetch("http://localhost/api/conversations")
        const payload = await response.json()
        expect(() => parseSchema(chatConversationsResponseSchema, payload)).not.toThrow()
    })

    it("returns an /api/conversations/:id/messages payload that parses through chatMessagesPageResponseSchema", async () => {
        const response = await fetch("http://localhost/api/conversations/conversation-1/messages")
        const payload = await response.json()
        expect(() => parseSchema(chatMessagesPageResponseSchema, payload)).not.toThrow()
    })

    it("returns an /api/messages/:id mutation payload that parses through chatMessageMutationResponseSchema", async () => {
        const response = await fetch("http://localhost/api/messages/conversation-1", {
            method: "POST",
            body: JSON.stringify({ content: "hi" }),
        })
        const payload = await response.json()
        expect(() => parseSchema(chatMessageMutationResponseSchema, payload)).not.toThrow()
    })
})
