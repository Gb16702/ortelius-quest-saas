import { logError } from "@/shared/lib/error"
import type { AssistantAttachment, AssistantConversation } from "./quest-assistant"
import {
    createAssistantConversationSnapshot,
    DEFAULT_ASSISTANT_CONVERSATION_TITLE,
} from "./quest-assistant-conversation.state"
import {
    type QuestAssistantRealtimeRecordResult,
    recordQuestAssistantPromptProjection,
    removeQuestAssistantConversationProjection,
    removeQuestAssistantProjectionParts,
} from "./quest-assistant-realtime-log.client"

export function recordAssistantPromptProjection(input: {
    userId: string | null | undefined
    conversation: AssistantConversation | null
    messageId: string
    content: string
    attachments: AssistantAttachment[]
    createdAt: string
    runId?: string | null
    failureMessage: string
}): Promise<QuestAssistantRealtimeRecordResult> | null {
    if (!input.conversation) return null

    const recordPromise = recordQuestAssistantPromptProjection({
        userId: input.userId,
        conversation: input.conversation,
        messageId: input.messageId,
        content: input.content,
        attachments: input.attachments,
        createdAt: input.createdAt,
        runId: input.runId,
    })

    void recordPromise.then((recordResult) => {
        if (recordResult.status === "failed") {
            logError(input.failureMessage, recordResult.error)
        }
    })

    return recordPromise
}

export async function reconcileAssistantPromptProjectionConversation(input: {
    promptProjectionPromise: Promise<QuestAssistantRealtimeRecordResult> | null
    userId: string | null | undefined
    optimisticConversation: AssistantConversation | null
    finalConversationId: string
    organizationId: string | undefined
    messageId: string
    content: string
    attachments: AssistantAttachment[]
    createdAt: string
    runId: string
}): Promise<void> {
    if (
        !input.optimisticConversation ||
        input.finalConversationId === input.optimisticConversation.id
    ) {
        return
    }

    await input.promptProjectionPromise
    await removeQuestAssistantConversationProjection({
        userId: input.userId,
        conversationId: input.optimisticConversation.id,
    })

    void recordAssistantPromptProjection({
        userId: input.userId,
        conversation: createAssistantConversationSnapshot({
            id: input.finalConversationId,
            userId: input.userId,
            organizationId: input.organizationId,
            title: DEFAULT_ASSISTANT_CONVERSATION_TITLE,
            createdAt: input.createdAt,
        }),
        messageId: input.messageId,
        content: input.content,
        attachments: input.attachments,
        createdAt: input.createdAt,
        runId: input.runId,
        failureMessage: "Failed to migrate assistant prompt projection",
    })
}

export async function rollbackAssistantPromptProjection(input: {
    promptProjectionPromise: Promise<QuestAssistantRealtimeRecordResult> | null
    userId: string | null | undefined
    optimisticConversation: AssistantConversation | null
    selectedConversationId: string | null
    userMessageId: string
}): Promise<void> {
    await input.promptProjectionPromise

    if (input.optimisticConversation) {
        await removeQuestAssistantConversationProjection({
            userId: input.userId,
            conversationId: input.optimisticConversation.id,
        })
        return
    }

    if (!input.selectedConversationId) return

    await removeQuestAssistantProjectionParts({
        userId: input.userId,
        conversationId: input.selectedConversationId,
        partIds: [input.userMessageId],
    })
}
