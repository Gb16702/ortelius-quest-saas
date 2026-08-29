import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { chatMessageMutationResponseSchema, messageDataSchema } from "../schemas/chats.schema"
import { createMessage } from "./message.factory"

describe("message factory contract", () => {
    it("produces an object that parses cleanly through messageDataSchema", () => {
        expect(() => parseSchema(messageDataSchema, createMessage())).not.toThrow()
    })

    it("parses inside the chat message mutation response envelope", () => {
        expect(() =>
            parseSchema(chatMessageMutationResponseSchema, { success: true, data: createMessage() })
        ).not.toThrow()
    })
})
