import { describe, expect, it } from "bun:test"
import type { AssistantConversation } from "../quest-assistant"
import { appendAssistantConversationProjectionPartDelta } from "../quest-assistant-projection.state"
import {
    createAssistantConversationProjection,
    getAssistantProjectionPartText,
} from "../quest-assistant-realtime-log.client"

const conversation: AssistantConversation = {
    id: "conversation-1",
    userId: "user-1",
    organizationId: "org-1",
    title: "Test",
    lastRoutePath: null,
    createdAt: "2026-06-11T12:00:00.000Z",
    updatedAt: "2026-06-11T12:00:00.000Z",
}

describe("appendAssistantConversationProjectionPartDelta", () => {
    it("uses absolute content when live and durable deltas overlap", () => {
        const withLiveContent = appendAssistantConversationProjectionPartDelta({
            projections: [],
            conversation,
            partId: "part-1",
            delta: "Hello",
            content: "Hello",
        })
        const withDurableContent = appendAssistantConversationProjectionPartDelta({
            projections: withLiveContent,
            conversation,
            partId: "part-1",
            delta: "Hello",
            content: "Hello",
        })

        expect(getAssistantProjectionPartText(withDurableContent[0]?.parts[0] ?? null)).toBe(
            "Hello"
        )
    })

    it("does not regress newer live content when an older durable batch arrives", () => {
        const projection = createAssistantConversationProjection({
            userId: "user-1",
            conversation,
            parts: [],
            status: "streaming",
            readAt: null,
            updatedAt: "2026-06-11T12:00:00.000Z",
        })
        const withNewerLiveContent = appendAssistantConversationProjectionPartDelta({
            projections: [projection],
            conversation,
            partId: "part-1",
            delta: "Hello world",
            content: "Hello world",
        })
        const withOlderDurableContent = appendAssistantConversationProjectionPartDelta({
            projections: withNewerLiveContent,
            conversation,
            partId: "part-1",
            delta: "Hello",
            content: "Hello",
        })

        expect(getAssistantProjectionPartText(withOlderDurableContent[0]?.parts[0] ?? null)).toBe(
            "Hello world"
        )
    })
})
