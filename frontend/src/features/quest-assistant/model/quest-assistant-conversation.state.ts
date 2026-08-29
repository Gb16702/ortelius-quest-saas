import type { AssistantConversation } from "./quest-assistant"
import { getCurrentRoutePath } from "./quest-assistant-runtime"

export const DEFAULT_ASSISTANT_CONVERSATION_TITLE = "New chat"

export function getAssistantActiveConversationId(input: {
    selectedConversationId: string | null
    requestedConversationId: string | null
    deletedConversationIds: ReadonlySet<string>
}): string | null {
    if (
        input.selectedConversationId &&
        !input.deletedConversationIds.has(input.selectedConversationId)
    ) {
        return input.selectedConversationId
    }

    if (
        input.requestedConversationId &&
        !input.deletedConversationIds.has(input.requestedConversationId)
    ) {
        return input.requestedConversationId
    }

    return null
}

export function getAssistantPromptProjectionConversation(input: {
    selectedConversation: AssistantConversation | null
    optimisticConversation: AssistantConversation | null
    selectedConversationId: string | null
    userId: string | null | undefined
    organizationId: string | undefined
    selectedTitle: string
    createdAt: string
}): AssistantConversation | null {
    if (input.selectedConversation) return input.selectedConversation
    if (input.optimisticConversation) return input.optimisticConversation
    if (!input.selectedConversationId) return null

    return createAssistantConversationSnapshot({
        id: input.selectedConversationId,
        userId: input.userId,
        organizationId: input.organizationId,
        title: input.selectedTitle,
        createdAt: input.createdAt,
    })
}

export function createAssistantConversationProjectionFallback(input: {
    conversationId: string
    selectedConversation: AssistantConversation | null
    selectedTitle: string
    userId: string | null | undefined
    organizationId: string | undefined
    createdAt: string
}): AssistantConversation {
    if (input.selectedConversation?.id === input.conversationId) {
        return input.selectedConversation
    }

    return createAssistantConversationSnapshot({
        id: input.conversationId,
        userId: input.userId,
        organizationId: input.organizationId,
        title: input.selectedTitle,
        createdAt: input.createdAt,
    })
}

export function upsertAssistantConversation(
    conversations: AssistantConversation[],
    nextConversation: AssistantConversation
): AssistantConversation[] {
    const existingConversation = conversations.find(
        (conversation) => conversation.id === nextConversation.id
    )
    const conversationToStore =
        existingConversation &&
        areAssistantConversationsEqual(existingConversation, nextConversation)
            ? existingConversation
            : nextConversation

    return [
        conversationToStore,
        ...conversations.filter((conversation) => conversation.id !== conversationToStore.id),
    ]
}

export function reconcileAssistantConversationList(input: {
    currentConversations: AssistantConversation[]
    fetchedConversations: AssistantConversation[]
    deletedConversationIds: ReadonlySet<string>
}): AssistantConversation[] {
    const fetchedConversations = input.fetchedConversations.filter(
        (conversation) => !input.deletedConversationIds.has(conversation.id)
    )
    const fetchedConversationsById = new Map(
        fetchedConversations.map((conversation) => [conversation.id, conversation])
    )
    const mergedExistingConversations = input.currentConversations.flatMap((conversation) => {
        if (input.deletedConversationIds.has(conversation.id)) return []

        const fetchedConversation = fetchedConversationsById.get(conversation.id)
        if (!fetchedConversation) return [conversation]

        return [
            areAssistantConversationsEqual(conversation, fetchedConversation)
                ? conversation
                : fetchedConversation,
        ]
    })
    const mergedConversationIds = new Set(
        mergedExistingConversations.map((conversation) => conversation.id)
    )
    const newFetchedConversations = fetchedConversations.filter(
        (conversation) => !mergedConversationIds.has(conversation.id)
    )

    return [...newFetchedConversations, ...mergedExistingConversations]
}

export function mergeAssistantConversationProjection(
    conversations: AssistantConversation[],
    projectedConversations: AssistantConversation[]
): AssistantConversation[] {
    const projectedConversationsById = new Map(
        projectedConversations.map((conversation) => [conversation.id, conversation])
    )
    const existingConversationIds = new Set(conversations.map((conversation) => conversation.id))
    const mergedConversations = conversations.map(
        (conversation) => projectedConversationsById.get(conversation.id) ?? conversation
    )
    const missingProjectedConversations = projectedConversations.filter(
        (conversation) => !existingConversationIds.has(conversation.id)
    )

    return [...mergedConversations, ...missingProjectedConversations]
}

export function createOptimisticAssistantConversation(input: {
    id: string
    userId: string | null | undefined
    organizationId: string | undefined
    createdAt: string
}): AssistantConversation {
    return {
        id: input.id,
        userId: input.userId ?? "pending-user",
        organizationId: input.organizationId ?? null,
        title: DEFAULT_ASSISTANT_CONVERSATION_TITLE,
        lastRoutePath: getCurrentRoutePath() ?? null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
    }
}

export function createAssistantConversationSnapshot(input: {
    id: string
    userId: string | null | undefined
    organizationId: string | undefined
    title: string
    createdAt: string
}): AssistantConversation {
    return {
        id: input.id,
        userId: input.userId ?? "pending-user",
        organizationId: input.organizationId ?? null,
        title: input.title,
        lastRoutePath: getCurrentRoutePath() ?? null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
    }
}

export function replaceOptimisticAssistantConversation(
    conversations: AssistantConversation[],
    optimisticConversationId: string,
    conversation: AssistantConversation
): AssistantConversation[] {
    return upsertAssistantConversation(
        removeAssistantConversation(conversations, optimisticConversationId),
        conversation
    )
}

export function replaceOptimisticAssistantConversationId(input: {
    conversations: AssistantConversation[]
    optimisticConversationId: string
    conversationId: string
}): AssistantConversation[] {
    return input.conversations.map((conversation) =>
        conversation.id === input.optimisticConversationId
            ? {
                  ...conversation,
                  id: input.conversationId,
              }
            : conversation
    )
}

export function removeAssistantConversation(
    conversations: AssistantConversation[],
    conversationId: string
): AssistantConversation[] {
    return conversations.filter((conversation) => conversation.id !== conversationId)
}

export function removeAssistantConversations(
    conversations: AssistantConversation[],
    conversationIds: string[]
): AssistantConversation[] {
    const conversationIdsToRemove = new Set(conversationIds)
    return conversations.filter((conversation) => !conversationIdsToRemove.has(conversation.id))
}

export function omitAssistantConversationTitle(
    titles: Record<string, string>,
    conversationId: string
): Record<string, string> {
    if (!(conversationId in titles)) return titles

    const { [conversationId]: _removedTitle, ...remainingTitles } = titles
    return remainingTitles
}

export function updateAssistantConversationTitle(
    conversations: AssistantConversation[],
    conversationId: string,
    title: string
): AssistantConversation[] {
    return conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, title } : conversation
    )
}

function areAssistantConversationsEqual(
    firstConversation: AssistantConversation,
    secondConversation: AssistantConversation
): boolean {
    return (
        firstConversation.id === secondConversation.id &&
        firstConversation.userId === secondConversation.userId &&
        firstConversation.organizationId === secondConversation.organizationId &&
        firstConversation.title === secondConversation.title &&
        firstConversation.lastRoutePath === secondConversation.lastRoutePath &&
        firstConversation.createdAt === secondConversation.createdAt &&
        firstConversation.updatedAt === secondConversation.updatedAt
    )
}
