import { afterEach, describe, expect, it } from "bun:test"
import { sendAssistantMessage } from "../quest-assistant-message-command"

const originalFetch = globalThis.fetch

afterEach(() => {
    globalThis.fetch = originalFetch
})

describe("sendAssistantMessage", () => {
    it("sends an assistant command and parses the conversation id", async () => {
        globalThis.fetch = Object.assign(
            (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
                expect(input).toBe("/api/assistant/messages")
                expect(init?.credentials).toBe("include")
                expect(init?.method).toBe("POST")
                expect(JSON.parse(String(init?.body))).toEqual({
                    conversationId: "conversation-1",
                    userMessageId: "63516c47-1156-44db-b517-48682d1bd4b1",
                    assistantMessageId: "77a68396-882f-4bc2-ae3b-ac79d6933e39",
                    message: "Where can I update the tagline?",
                    context: {
                        organizationId: "org-1",
                        routePath: "/org/acme/settings/branding",
                    },
                })

                return Promise.resolve(
                    Response.json({
                        success: true,
                        data: {
                            conversationId: "conversation-1",
                            userMessageId: "63516c47-1156-44db-b517-48682d1bd4b1",
                            assistantMessageId: "77a68396-882f-4bc2-ae3b-ac79d6933e39",
                            runId: "run-1",
                            lastSyncId: 12,
                        },
                    })
                )
            },
            { preconnect: originalFetch.preconnect }
        ) satisfies typeof fetch

        await expect(
            sendAssistantMessage({
                conversationId: "conversation-1",
                userMessageId: "63516c47-1156-44db-b517-48682d1bd4b1",
                assistantMessageId: "77a68396-882f-4bc2-ae3b-ac79d6933e39",
                message: "Where can I update the tagline?",
                context: {
                    organizationId: "org-1",
                    routePath: "/org/acme/settings/branding",
                },
            })
        ).resolves.toEqual({
            conversationId: "conversation-1",
            userMessageId: "63516c47-1156-44db-b517-48682d1bd4b1",
            assistantMessageId: "77a68396-882f-4bc2-ae3b-ac79d6933e39",
            runId: "run-1",
            lastSyncId: 12,
        })
    })

    it("sends attachment ids with the assistant command", async () => {
        globalThis.fetch = Object.assign(
            (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
                expect(JSON.parse(String(init?.body))).toEqual({
                    message: "What is in this file?",
                    attachmentIds: ["2a0d6f7d-7f1f-48a5-a1d9-7c60e2ea6a62"],
                })

                return Promise.resolve(
                    Response.json({
                        success: true,
                        data: {
                            conversationId: "conversation-1",
                            userMessageId: "63516c47-1156-44db-b517-48682d1bd4b1",
                            assistantMessageId: "77a68396-882f-4bc2-ae3b-ac79d6933e39",
                            runId: "run-1",
                            lastSyncId: 1,
                        },
                    })
                )
            },
            { preconnect: originalFetch.preconnect }
        ) satisfies typeof fetch

        await expect(
            sendAssistantMessage({
                message: "What is in this file?",
                attachmentIds: ["2a0d6f7d-7f1f-48a5-a1d9-7c60e2ea6a62"],
            })
        ).resolves.toEqual({
            conversationId: "conversation-1",
            userMessageId: "63516c47-1156-44db-b517-48682d1bd4b1",
            assistantMessageId: "77a68396-882f-4bc2-ae3b-ac79d6933e39",
            runId: "run-1",
            lastSyncId: 1,
        })
    })

    it("rejects invalid assistant command responses", async () => {
        globalThis.fetch = Object.assign(
            () =>
                Promise.resolve(
                    Response.json({
                        success: true,
                        data: {},
                    })
                ),
            { preconnect: originalFetch.preconnect }
        ) satisfies typeof fetch

        await expect(
            sendAssistantMessage({
                message: "Hello",
            })
        ).rejects.toThrow("Assistant command response is invalid")
    })
})
