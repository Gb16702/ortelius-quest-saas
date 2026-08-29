import type { MessageDeletedMessage, MessageEditedMessage } from "@ortelius/websocket-types"
import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type { ChatMessagesPageResponse, MessageData } from "../model/chat"
import { chatKeys, MESSAGE_PAGE_LIMIT } from "./chat.query-keys"

interface ChatMessagePageScope {
    userId: string | undefined
    scope: string
    conversationId: string
}

interface CachedChatMessagePagesUpdateResult {
    updatedCount: number
}

type ChatMessagePageUpdater = (
    page: ChatMessagesPageResponse
) => ChatMessagesPageResponse | undefined

export function appendMessageToCachedFirstMessagePages(
    queryClient: QueryClient,
    scope: ChatMessagePageScope,
    message: MessageData
): CachedChatMessagePagesUpdateResult {
    return updateCachedFirstMessagePages(queryClient, scope, (page) =>
        appendMessageToFirstPage(page, message)
    )
}

export function applyMessageEditToCachedFirstMessagePages(
    queryClient: QueryClient,
    scope: ChatMessagePageScope,
    message: MessageEditedMessage
): CachedChatMessagePagesUpdateResult {
    if (!message.data?.id) return { updatedCount: 0 }

    const editedMessage = message.data

    return updateCachedFirstMessagePages(queryClient, scope, (page) =>
        updateMessagesPage(page, (candidate) => {
            if (candidate.id === editedMessage.id) {
                return {
                    ...candidate,
                    content: editedMessage.content,
                    isEdited: editedMessage.isEdited,
                    updatedAt: editedMessage.updatedAt,
                }
            }

            if (candidate.replyTo?.id === editedMessage.id) {
                return {
                    ...candidate,
                    replyTo: {
                        ...candidate.replyTo,
                        content: editedMessage.content,
                    },
                }
            }

            return candidate
        })
    )
}

export function applyMessageDeleteToCachedFirstMessagePages(
    queryClient: QueryClient,
    scope: ChatMessagePageScope,
    message: MessageDeletedMessage
): CachedChatMessagePagesUpdateResult {
    return updateCachedFirstMessagePages(queryClient, scope, (page) =>
        updateMessagesPage(page, (candidate) => {
            if (candidate.id === message.messageId) {
                return {
                    ...candidate,
                    isDeleted: true,
                }
            }

            if (candidate.replyTo?.id === message.messageId) {
                return {
                    ...candidate,
                    replyTo: {
                        ...candidate.replyTo,
                        isDeleted: true,
                    },
                }
            }

            return candidate
        })
    )
}

function updateCachedFirstMessagePages(
    queryClient: QueryClient,
    scope: ChatMessagePageScope,
    updatePage: ChatMessagePageUpdater
): CachedChatMessagePagesUpdateResult {
    if (!scope.userId) return { updatedCount: 0 }

    const queryKey = chatKeys.messagesPageConversation({
        userId: scope.userId,
        scope: scope.scope,
        conversationId: scope.conversationId,
    })
    const queries = queryClient.getQueryCache().findAll({ queryKey })
    let updatedCount = 0

    for (const query of queries) {
        if (!isFirstMessagePageQueryKey(query.queryKey)) continue

        const data = queryClient.getQueryData<ChatMessagesPageResponse>(query.queryKey)
        if (!data) continue

        const nextData = updatePage(data)
        if (!nextData || nextData === data) continue

        queryClient.setQueryData(query.queryKey, nextData)
        updatedCount += 1
    }

    return { updatedCount }
}

function appendMessageToFirstPage(
    page: ChatMessagesPageResponse,
    message: MessageData
): ChatMessagesPageResponse {
    const currentMessages = page.data.messages
    if (currentMessages.some((candidate) => candidate.id === message.id)) return page

    const pagination = page.data.pagination
    const pageLimit = Number(pagination?.limit ?? MESSAGE_PAGE_LIMIT)
    const messagesWithNew = [...currentMessages, message]
    const isTrimmed = messagesWithNew.length > pageLimit
    const nextMessages = isTrimmed
        ? messagesWithNew.slice(messagesWithNew.length - pageLimit)
        : messagesWithNew

    return {
        ...page,
        data: {
            ...page.data,
            messages: nextMessages,
            pagination: {
                ...pagination,
                total: Number(pagination?.total ?? currentMessages.length) + 1,
                limit: pageLimit,
                offset: Number(pagination?.offset ?? 0),
                hasMore: Boolean(pagination?.hasMore || isTrimmed),
            },
        },
    }
}

function updateMessagesPage(
    page: ChatMessagesPageResponse,
    updateMessage: (message: MessageData) => MessageData
): ChatMessagesPageResponse | undefined {
    let didUpdate = false
    const messages = page.data.messages.map((message) => {
        const nextMessage = updateMessage(message)
        if (nextMessage !== message) {
            didUpdate = true
        }
        return nextMessage
    })

    if (!didUpdate) return undefined

    return {
        ...page,
        data: {
            ...page.data,
            messages,
        },
    }
}

function isFirstMessagePageQueryKey(queryKey: QueryKey): boolean {
    return queryKey.at(-1) === 0
}
