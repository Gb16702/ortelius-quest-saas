import { afterEach, describe, expect, it } from "bun:test"
import { fetchAssistantSyncActions } from "../quest-assistant-sync.api"

const originalFetch = globalThis.fetch

afterEach(() => {
    globalThis.fetch = originalFetch
})

describe("fetchAssistantSyncActions", () => {
    it("requests assistant sync actions after a durable cursor with a batch limit", async () => {
        globalThis.fetch = Object.assign(
            (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
                expect(input).toBe("/api/assistant/sync?after=12&limit=50")
                expect(init?.credentials).toBe("include")

                return Promise.resolve(
                    Response.json({
                        success: true,
                        data: {
                            firstSyncId: 1,
                            lastSyncId: 13,
                            hasMore: true,
                            actions: [
                                {
                                    syncId: 13,
                                    userId: "user-1",
                                    organizationId: "org-1",
                                    conversationId: "conversation-1",
                                    modelName: "assistant_part",
                                    modelId: "part-1",
                                    operation: "update",
                                    payload: {
                                        type: "part_delta",
                                        partId: "part-1",
                                        delta: "Hello",
                                    },
                                    createdAt: "2026-06-11T12:00:00.000Z",
                                },
                            ],
                        },
                    })
                )
            },
            { preconnect: originalFetch.preconnect }
        ) satisfies typeof fetch

        await expect(fetchAssistantSyncActions({ after: 12, limit: 50 })).resolves.toEqual({
            firstSyncId: 1,
            lastSyncId: 13,
            hasMore: true,
            actions: [
                expect.objectContaining({
                    syncId: 13,
                    payload: {
                        type: "part_delta",
                        partId: "part-1",
                        delta: "Hello",
                    },
                }),
            ],
        })
    })
})
