import { describe, expect, it } from "bun:test"
import type {
    AssistantAction,
    AssistantConversation,
    AssistantConversationPart,
    AssistantMessage,
    AssistantSyncAction,
} from "../quest-assistant"
import {
    applyRecordedQuestAssistantRealtimeEvent,
    type QuestAssistantRealtimeActions,
    type QuestAssistantRealtimeState,
} from "../quest-assistant-realtime-application"

const realtimeState = {
    isStreaming: true,
    locallyManagedConversationId: null,
    selectedConversationId: "conversation-1",
    deletedConversationIds: new Set<string>(),
} satisfies QuestAssistantRealtimeState

function createSyncAction(
    payload: AssistantSyncAction["payload"],
    overrides: Partial<AssistantSyncAction> = {}
): AssistantSyncAction {
    return {
        syncId: 1,
        userId: "user-1",
        organizationId: "org-1",
        conversationId: "conversation-1",
        modelName: "assistant_part",
        modelId: "part-1",
        operation: "update",
        payload,
        createdAt: "2026-06-11T12:00:00.000Z",
        ...overrides,
    }
}

function createRealtimeActions(calls: string[]): QuestAssistantRealtimeActions {
    return {
        applyConversationCreated: (_conversation: AssistantConversation) => {
            calls.push("conversation_created")
        },
        selectLocalConversation: () => {
            calls.push("select_local_conversation")
        },
        applyConversationTitleUpdate: () => {
            calls.push("title_updated")
        },
        applyConversationDeleted: () => {
            calls.push("conversation_deleted")
        },
        applyAssistantMessageInserted: (_message: AssistantMessage) => {
            calls.push("message_inserted")
        },
        applyAssistantPartStarted: (_part: AssistantConversationPart) => {
            calls.push("part_started")
        },
        applyAssistantPartDelta: () => {
            calls.push("part_delta")
        },
        applyAssistantPartCompleted: () => {
            calls.push("part_completed")
        },
        applyAssistantActionUpdate: (_action: AssistantAction) => {
            calls.push("action_updated")
        },
        completeAssistantRun: () => {
            calls.push("run_completed")
        },
        failAssistantRun: () => {
            calls.push("run_failed")
        },
    }
}

describe("applyRecordedQuestAssistantRealtimeEvent", () => {
    it("applies stored sync actions for the selected chat", () => {
        const calls: string[] = []

        applyRecordedQuestAssistantRealtimeEvent({
            syncAction: createSyncAction({
                type: "part_delta",
                partId: "part-1",
                delta: "Hello",
            }),
            recordResult: { status: "stored" },
            state: realtimeState,
            actions: createRealtimeActions(calls),
        })

        expect(calls).toEqual(["part_delta"])
    })

    it("ignores duplicate sync actions", () => {
        const calls: string[] = []

        applyRecordedQuestAssistantRealtimeEvent({
            syncAction: createSyncAction({
                type: "run_completed",
                messageId: null,
            }),
            recordResult: { status: "duplicate" },
            state: realtimeState,
            actions: createRealtimeActions(calls),
        })

        expect(calls).toEqual([])
    })

    it("does not apply gap sync actions before catch-up has filled missing ids", () => {
        const calls: string[] = []

        applyRecordedQuestAssistantRealtimeEvent({
            syncAction: createSyncAction({
                type: "part_completed",
                partId: "part-1",
                content: "Hello from the completed assistant part.",
            }),
            recordResult: { status: "gap" },
            state: realtimeState,
            actions: createRealtimeActions(calls),
        })

        expect(calls).toEqual([])
    })

    it("applies conversation deletes outside the current chat filter", () => {
        const calls: string[] = []

        applyRecordedQuestAssistantRealtimeEvent({
            syncAction: createSyncAction(
                {
                    type: "conversation_deleted",
                    conversationId: "conversation-2",
                    deletedAt: "2026-06-11T12:05:00.000Z",
                },
                {
                    conversationId: "conversation-2",
                    modelName: "assistant_conversation",
                    modelId: "conversation-2",
                    operation: "delete",
                }
            ),
            recordResult: { status: "stored" },
            state: realtimeState,
            actions: createRealtimeActions(calls),
        })

        expect(calls).toEqual(["conversation_deleted"])
    })

    it("does not resurrect a deleted conversation with later non-delete actions", () => {
        const calls: string[] = []

        applyRecordedQuestAssistantRealtimeEvent({
            syncAction: createSyncAction({
                type: "part_delta",
                partId: "part-1",
                delta: "Hello",
            }),
            recordResult: { status: "stored" },
            state: {
                ...realtimeState,
                deletedConversationIds: new Set(["conversation-1"]),
            },
            actions: createRealtimeActions(calls),
        })

        expect(calls).toEqual([])
    })
})
