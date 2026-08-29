import { logError } from "@/shared/lib/error"
import type {
    AssistantAction,
    AssistantConversation,
    AssistantConversationPart,
    AssistantConversationProjection,
    AssistantMessage,
    AssistantSyncAction,
} from "./quest-assistant"
import {
    type QuestAssistantRealtimeProjection,
    type QuestAssistantRealtimeRecordResult,
    recordQuestAssistantSyncAction,
} from "./quest-assistant-realtime-log.client"

export interface QuestAssistantRealtimeState {
    isStreaming: boolean
    locallyManagedConversationId: string | null
    selectedConversationId: string | null
    deletedConversationIds: ReadonlySet<string>
}

export interface QuestAssistantRealtimeActions {
    applyConversationCreated: (conversation: AssistantConversation) => void
    selectLocalConversation: (conversationId: string) => void
    applyConversationTitleUpdate: (input: { conversationId: string; title: string }) => void
    applyConversationDeleted: (input: { conversationId: string; deletedAt: string }) => void
    applyAssistantMessageInserted: (message: AssistantMessage) => void
    applyAssistantPartStarted: (part: AssistantConversationPart) => void
    applyAssistantPartDelta: (input: {
        conversationId: string
        partId: string
        delta: string
        content?: string
    }) => void
    applyAssistantPartCompleted: (input: {
        conversationId: string
        partId: string
        content?: string
    }) => void
    applyAssistantActionUpdate: (action: AssistantAction) => void
    completeAssistantRun: (conversationId: string) => void
    failAssistantRun: (input: { conversationId: string; message: string; code?: string }) => void
}

export interface QuestAssistantRealtimeProjectionHydrationInput {
    projection: QuestAssistantRealtimeProjection
    selectedConversationId: string | null
    rememberDeletedConversation: (conversationId: string) => void
    confirmDeletedConversation: (conversationId: string) => void
    resetDeletedConversationState: (conversationId: string) => void
    applyDeletedConversationProjection: (conversationIds: string[]) => void
    mergeConversationProjections: (projections: AssistantConversationProjection[]) => void
    mergeActions: (actions: AssistantAction[]) => void
}

export function hydrateQuestAssistantRealtimeProjection(
    input: QuestAssistantRealtimeProjectionHydrationInput
) {
    hydrateQuestAssistantDeletedConversationProjection(input)
    hydrateQuestAssistantConversationProjection(input)
    hydrateQuestAssistantActionProjection(input)
}

function hydrateQuestAssistantDeletedConversationProjection(
    input: QuestAssistantRealtimeProjectionHydrationInput
) {
    if (input.projection.deletedConversations.length === 0) return

    const deletedConversationIds = input.projection.deletedConversations.map(
        (tombstone) => tombstone.conversationId
    )

    for (const tombstone of input.projection.deletedConversations) {
        if (tombstone.source === "server") {
            input.confirmDeletedConversation(tombstone.conversationId)
        }
        input.rememberDeletedConversation(tombstone.conversationId)
        input.resetDeletedConversationState(tombstone.conversationId)
    }

    input.applyDeletedConversationProjection(deletedConversationIds)
}

function hydrateQuestAssistantConversationProjection(
    input: QuestAssistantRealtimeProjectionHydrationInput
) {
    if (input.projection.conversationProjections.length === 0) return

    input.mergeConversationProjections(input.projection.conversationProjections)
}

function hydrateQuestAssistantActionProjection(
    input: QuestAssistantRealtimeProjectionHydrationInput
) {
    if (!input.selectedConversationId || input.projection.actions.length === 0) return

    input.mergeActions(input.projection.actions)
}

export function applyRecordedQuestAssistantRealtimeEvent(input: {
    syncAction: AssistantSyncAction
    recordResult: QuestAssistantRealtimeRecordResult
    state: QuestAssistantRealtimeState
    actions: QuestAssistantRealtimeActions
}) {
    if (input.recordResult.status === "failed") {
        logError("Failed to persist assistant realtime event", input.recordResult.error)
    }

    if (input.recordResult.status === "duplicate" || input.recordResult.status === "gap") return

    if (
        input.syncAction.payload.type !== "conversation_deleted" &&
        input.state.deletedConversationIds.has(input.syncAction.conversationId)
    ) {
        return
    }

    if (applyConversationRealtimeEvent(input)) return
    if (!shouldApplyAssistantRealtimeEventToCurrentChat(input.syncAction, input.state)) {
        return
    }

    applyCurrentChatRealtimeEvent(input.syncAction, input.actions)
}

export async function recordAndApplyQuestAssistantSyncActions(input: {
    userId: string | null | undefined
    syncActions: AssistantSyncAction[]
    shouldApply: () => boolean
    getState: () => QuestAssistantRealtimeState
    actions: QuestAssistantRealtimeActions
}): Promise<QuestAssistantRealtimeRecordResult> {
    let latestResult: QuestAssistantRealtimeRecordResult = { status: "stored" }

    for (const syncAction of [...input.syncActions].sort((a, b) => a.syncId - b.syncId)) {
        const recordResult = await recordQuestAssistantSyncAction({
            userId: input.userId,
            syncAction,
        })
        latestResult = recordResult

        if (recordResult.status === "gap") return recordResult
        if (!input.shouldApply()) continue

        applyRecordedQuestAssistantRealtimeEvent({
            syncAction,
            recordResult,
            state: input.getState(),
            actions: input.actions,
        })
    }

    return latestResult
}

function applyConversationRealtimeEvent(input: {
    syncAction: AssistantSyncAction
    state: QuestAssistantRealtimeState
    actions: QuestAssistantRealtimeActions
}): boolean {
    const event = input.syncAction.payload

    switch (event.type) {
        case "conversation_created":
            input.actions.applyConversationCreated(event.conversation)
            if (input.state.isStreaming && !input.state.selectedConversationId) {
                input.actions.selectLocalConversation(event.conversation.id)
            }
            return true
        case "title_updated":
            input.actions.applyConversationTitleUpdate({
                conversationId: event.conversationId,
                title: event.title,
            })
            return true
        case "conversation_updated":
            input.actions.applyConversationCreated(event.conversation)
            return true
        case "conversation_deleted":
            input.actions.applyConversationDeleted({
                conversationId: event.conversationId,
                deletedAt: event.deletedAt,
            })
            return true
        default:
            return false
    }
}

function applyCurrentChatRealtimeEvent(
    syncAction: AssistantSyncAction,
    actions: QuestAssistantRealtimeActions
) {
    const event = syncAction.payload

    switch (event.type) {
        case "message_inserted":
            actions.applyAssistantMessageInserted(event.message)
            return
        case "part_started":
            actions.applyAssistantPartStarted(event.part)
            return
        case "part_delta":
            actions.applyAssistantPartDelta({
                conversationId: syncAction.conversationId,
                partId: event.partId,
                delta: event.delta,
                content: event.content,
            })
            return
        case "part_completed":
            actions.applyAssistantPartCompleted({
                conversationId: syncAction.conversationId,
                partId: event.partId,
                content: event.content,
            })
            return
        case "action_proposed":
        case "action_updated":
            actions.applyAssistantActionUpdate(event.action)
            return
        case "run_completed":
            actions.completeAssistantRun(syncAction.conversationId)
            return
        case "run_failed":
            actions.failAssistantRun({
                conversationId: syncAction.conversationId,
                message: event.message,
                code: event.code,
            })
            return
        default:
            return
    }
}

export function shouldApplyAssistantRealtimeEventToCurrentChat(
    syncAction: AssistantSyncAction,
    state: QuestAssistantRealtimeState
): boolean {
    if (state.selectedConversationId) {
        return (
            syncAction.conversationId === state.selectedConversationId ||
            syncAction.conversationId === state.locallyManagedConversationId
        )
    }

    return state.isStreaming
}
