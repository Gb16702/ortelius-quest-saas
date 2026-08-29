import { describe, expect, it } from "bun:test"
import { QuestAssistantStore } from "../quest-assistant.state"

describe("QuestAssistantStore assistant run runtime", () => {
    it("keeps initial history loading until concurrent hydration requests finish", () => {
        const store = new QuestAssistantStore()

        expect(store.isConversationsLoading).toBe(false)
        expect(store.isConversationHistoryInitialLoading).toBe(false)

        store.beginConversationHistoryLoad()
        store.beginConversationHistoryLoad()

        expect(store.isConversationsLoading).toBe(true)
        expect(store.isConversationHistoryInitialLoading).toBe(true)

        store.finishConversationHistoryLoad()

        expect(store.isConversationsLoading).toBe(true)
        expect(store.isConversationHistoryInitialLoading).toBe(true)

        store.finishConversationHistoryLoad()

        expect(store.isConversationsLoading).toBe(false)
        expect(store.isConversationHistoryInitialLoading).toBe(false)
    })

    it("resets history load errors when a new hydration starts", () => {
        const store = new QuestAssistantStore()

        store.beginConversationHistoryLoad()
        store.finishConversationHistoryLoad({ failed: true })

        expect(store.isConversationLoadError).toBe(true)
        expect(store.conversationHistoryLoadRequests).toBe(0)

        store.beginConversationHistoryLoad()

        expect(store.isConversationLoadError).toBe(false)
        expect(store.isConversationsLoading).toBe(true)

        store.finishConversationHistoryLoad()

        expect(store.isConversationsLoading).toBe(false)
    })

    it("derives streaming from the active run", () => {
        const store = new QuestAssistantStore()

        expect(store.isStreaming).toBe(false)

        store.startAssistantRun({ conversationId: "conversation-1" })

        expect(store.isStreaming).toBe(true)
        expect(store.activeRun).toEqual({
            conversationId: "conversation-1",
            runId: null,
        })

        store.acceptAssistantRun({
            conversationId: "conversation-1",
            runId: "run-1",
        })

        expect(store.isStreaming).toBe(true)
        expect(store.activeRun).toEqual({
            conversationId: "conversation-1",
            runId: "run-1",
        })

        store.clearAssistantRun()

        expect(store.isStreaming).toBe(false)
        expect(store.activeRun).toBeNull()
    })

    it("does not resurrect a run after a terminal event cleared it", () => {
        const store = new QuestAssistantStore()

        store.startAssistantRun({ conversationId: "optimistic-conversation" })
        store.clearAssistantRun()
        store.acceptAssistantRun({
            optimisticConversationId: "optimistic-conversation",
            conversationId: "conversation-1",
            runId: "run-1",
        })

        expect(store.isStreaming).toBe(false)
        expect(store.activeRun).toBeNull()
    })

    it("tracks run cancellation without making cancellation a separate streaming source", () => {
        const store = new QuestAssistantStore()

        store.startAssistantRun({ conversationId: "conversation-1", runId: "run-1" })
        store.startAssistantRunCancellation()

        expect(store.isStreaming).toBe(true)
        expect(store.isCancellingRun).toBe(true)

        store.clearAssistantRun()

        expect(store.isStreaming).toBe(false)
        expect(store.isCancellingRun).toBe(false)
    })
})
