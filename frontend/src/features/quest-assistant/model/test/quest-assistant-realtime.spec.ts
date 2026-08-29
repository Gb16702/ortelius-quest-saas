import { describe, expect, it } from "bun:test"
import {
    parseQuestAssistantLiveDeltaMessage,
    parseQuestAssistantSyncAvailableMessage,
} from "../quest-assistant-realtime"

describe("parseQuestAssistantSyncAvailableMessage", () => {
    it("extracts the latest durable sync id from assistant websocket notifications", () => {
        expect(
            parseQuestAssistantSyncAvailableMessage({
                type: "assistant:sync_available",
                latestSyncId: 42,
                timestamp: "2026-06-11T12:00:00.000Z",
            })
        ).toEqual({
            type: "sync_available",
            latestSyncId: 42,
        })
    })

    it("reports invalid sync notifications", () => {
        const result = parseQuestAssistantSyncAvailableMessage({
            type: "assistant:sync_available",
            timestamp: "2026-06-11T12:00:00.000Z",
        })

        expect(result.type).toBe("invalid")
        if (result.type === "invalid") {
            expect(result.messageType).toBe("assistant:sync_available")
            expect(result.error.issues.length).toBeGreaterThan(0)
        }
    })

    it("ignores non-assistant sync messages", () => {
        expect(
            parseQuestAssistantSyncAvailableMessage({
                type: "notification",
                timestamp: "2026-06-11T12:00:00.000Z",
            })
        ).toEqual({ type: "ignored" })
    })
})

describe("parseQuestAssistantLiveDeltaMessage", () => {
    it("extracts transient assistant live text deltas", () => {
        expect(
            parseQuestAssistantLiveDeltaMessage({
                type: "assistant:live_delta",
                conversationId: "conversation-1",
                partId: "part-1",
                runId: "run-1",
                delta: "Hello",
                content: "Hello",
                timestamp: "2026-06-11T12:00:00.000Z",
            })
        ).toEqual({
            type: "live_delta",
            conversationId: "conversation-1",
            partId: "part-1",
            runId: "run-1",
            delta: "Hello",
            content: "Hello",
        })
    })

    it("reports invalid live delta messages", () => {
        const result = parseQuestAssistantLiveDeltaMessage({
            type: "assistant:live_delta",
            conversationId: "conversation-1",
            timestamp: "2026-06-11T12:00:00.000Z",
        })

        expect(result.type).toBe("invalid")
        if (result.type === "invalid") {
            expect(result.messageType).toBe("assistant:live_delta")
            expect(result.error.issues.length).toBeGreaterThan(0)
        }
    })
})
