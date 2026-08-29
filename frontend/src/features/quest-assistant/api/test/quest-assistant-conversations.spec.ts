import { afterEach, describe, expect, it } from "bun:test"
import { deleteAssistantConversation } from "../quest-assistant-conversations.api"

const originalFetch = globalThis.fetch

afterEach(() => {
    globalThis.fetch = originalFetch
})

describe("deleteAssistantConversation", () => {
    it("sends an idempotent assistant conversation delete command", async () => {
        globalThis.fetch = Object.assign(
            (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
                expect(input).toBe("/api/assistant/conversations/conversation-1")
                expect(init?.credentials).toBe("include")
                expect(init?.method).toBe("DELETE")

                return Promise.resolve(new Response(null, { status: 204 }))
            },
            { preconnect: originalFetch.preconnect }
        ) satisfies typeof fetch

        await expect(deleteAssistantConversation("conversation-1")).resolves.toBeUndefined()
    })

    it("surfaces backend delete failures", async () => {
        let requestCount = 0

        globalThis.fetch = Object.assign(
            () => {
                requestCount += 1
                return Promise.resolve(
                    Response.json(
                        {
                            success: false,
                            code: "FORBIDDEN",
                            message: "Conversation access denied",
                        },
                        { status: 403 }
                    )
                )
            },
            { preconnect: originalFetch.preconnect }
        ) satisfies typeof fetch

        await expect(deleteAssistantConversation("conversation-1")).rejects.toThrow(
            "Conversation access denied"
        )
        expect(requestCount).toBe(1)
    })
})
