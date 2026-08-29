import { MessageReadMessageSchema } from "@ortelius/websocket-types/messages"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useRef } from "react"
import { readJsonResponse } from "@/shared/api/http.response"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { chatKeys } from "../../api/chat.query-keys"
import {
    chatApiErrorResponseSchema,
    type ReaderInfo,
    type ReadStatusData,
    readStatusApiResponseSchema,
} from "../schemas/chats.schema"
import { useWebSocketMessage } from "./use-web-socket-message"

const READ_STATUS_LIMIT = 100

export type MessageReadStatus = "sent" | "seen"
export type MessageId = string
export type { ReaderInfo } from "../schemas/chats.schema"

interface MessageStatus {
    seenStatus: MessageReadStatus
    readBy: ReaderInfo[]
}

interface UseMessageReadStatusProps {
    conversationId: string
    userId: string
    userMessageIds: MessageId[]
    allMessageIds: MessageId[]
    canReadConversation: boolean
}

function getChatErrorMessage(payload: unknown, fallback: string): string {
    const result = safeParseSchema(chatApiErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.data.message || fallback
}

export const useMessageReadStatus = ({
    conversationId,
    userId,
    userMessageIds,
    allMessageIds,
    canReadConversation,
}: UseMessageReadStatusProps) => {
    const { isConnected } = useWebSocket()
    const queryClient = useQueryClient()
    const markRequestsRef = useRef<Map<string, Promise<void>>>(new Map())
    const readStatusQueryKey = chatKeys.readStatus({
        conversationId,
        limit: READ_STATUS_LIMIT,
        offset: 0,
    })

    const readStatusQuery = useQuery({
        queryKey: readStatusQueryKey,
        queryFn: async () => {
            const res = await fetch(
                `/api/conversations/${conversationId}/read-status?limit=${READ_STATUS_LIMIT}&offset=0`,
                {
                    credentials: "include",
                }
            )

            const json = await readJsonResponse(res)
            if (!res.ok) {
                throw new Error(getChatErrorMessage(json, "Failed to load read statuses"))
            }

            const parsed = parseSchema(readStatusApiResponseSchema, json)
            if (parsed.success === false) {
                throw new Error(parsed.message || "Failed to load read statuses")
            }

            return parsed.readStatuses
        },
        enabled: Boolean(conversationId && isConnected && canReadConversation),
        staleTime: 60_000,
        gcTime: 5 * 60 * 1000,
        refetchOnReconnect: "always" as const,
        refetchOnWindowFocus: false,
    })

    const readStatuses = useMemo(() => {
        const statusMap = new Map<MessageId, MessageStatus>()

        for (const status of readStatusQuery.data || []) {
            if (status.messageId && status.seenStatus) {
                statusMap.set(status.messageId, {
                    seenStatus: status.seenStatus,
                    readBy: status.readBy || [],
                })
            }
        }

        return statusMap
    }, [readStatusQuery.data])

    const enrichedReadStatuses = useMemo(() => {
        const enriched = new Map(readStatuses)
        for (const id of userMessageIds) {
            if (!enriched.has(id)) {
                enriched.set(id, { seenStatus: "sent", readBy: [] })
            }
        }
        return enriched
    }, [readStatuses, userMessageIds])

    const lastMessageId = useMemo(
        () => (allMessageIds.length > 0 ? allMessageIds[allMessageIds.length - 1] : null),
        [allMessageIds]
    )

    const isLastMessageFromUser = useMemo(
        () => Boolean(lastMessageId && userMessageIds.includes(lastMessageId)),
        [lastMessageId, userMessageIds]
    )

    const loadReadStatuses = useCallback(async () => {
        if (!conversationId || !isConnected || !canReadConversation) return
        await readStatusQuery.refetch({ throwOnError: false })
    }, [canReadConversation, conversationId, isConnected, readStatusQuery.refetch])

    const markConversationAsRead = useCallback(
        async (targetConversationId: string) => {
            if (!targetConversationId || !canReadConversation) return

            const activeRequest = markRequestsRef.current.get(targetConversationId)
            if (activeRequest) {
                return activeRequest
            }

            const request = fetch(`/api/conversations/${targetConversationId}/mark-read`, {
                method: "POST",
                credentials: "include",
            })
                .then(async (res) => {
                    const json = await readJsonResponse(res)
                    if (!res.ok) {
                        throw new Error(
                            getChatErrorMessage(json, "Failed to mark conversation as read")
                        )
                    }
                })
                .finally(() => {
                    if (markRequestsRef.current.get(targetConversationId) === request) {
                        markRequestsRef.current.delete(targetConversationId)
                    }
                })

            markRequestsRef.current.set(targetConversationId, request)
            return request
        },
        [canReadConversation]
    )

    useWebSocketMessage(
        "message_read",
        useCallback(
            (rawMessage: unknown) => {
                const parsed = safeParseSchema(MessageReadMessageSchema, rawMessage)
                if (!parsed.success) {
                    console.error("Invalid message_read WebSocket payload:", parsed.error)
                    return
                }

                const messageData = parsed.data.data
                const readBy = messageData.readBy
                const messageId = messageData.messageId
                const conversationIdFromWS = messageData.conversationId
                const readerInfo = messageData.readerInfo

                if (
                    messageId &&
                    readBy !== userId &&
                    conversationIdFromWS === conversationId &&
                    readerInfo
                ) {
                    queryClient.setQueryData<ReadStatusData[]>(
                        chatKeys.readStatus({
                            conversationId,
                            limit: READ_STATUS_LIMIT,
                            offset: 0,
                        }),
                        (previous = []) => {
                            const next = [...previous]
                            const existingIndex = next.findIndex(
                                (status) => status.messageId === messageId
                            )
                            const existingReaders =
                                existingIndex >= 0 ? next[existingIndex].readBy || [] : []

                            const readerExists = existingReaders.some(
                                (r) => r.userId === readerInfo.userId
                            )

                            if (readerExists) return previous

                            const updatedReaders = [
                                ...existingReaders,
                                {
                                    userId: readerInfo.userId,
                                    userName: readerInfo.userName ?? "Unknown",
                                    userImage: readerInfo.userImage,
                                    readAt: new Date().toISOString(),
                                },
                            ]

                            if (existingIndex >= 0) {
                                next[existingIndex] = {
                                    ...next[existingIndex],
                                    seenStatus: "seen",
                                    readBy: updatedReaders,
                                }
                                return next
                            }

                            return [
                                ...next,
                                {
                                    messageId,
                                    seenStatus: "seen",
                                    readBy: updatedReaders,
                                },
                            ]
                        }
                    )
                }
            },
            [userId, conversationId, queryClient]
        )
    )

    const shouldShowSeen = (messageId: MessageId): boolean => {
        const isAbsoluteLastMessage = messageId === lastMessageId
        const isFromCurrentUser = isLastMessageFromUser
        const status = enrichedReadStatuses.get(messageId)
        return isAbsoluteLastMessage && isFromCurrentUser && status?.seenStatus === "seen"
    }

    const findMessageReaders = (messageId: MessageId): ReaderInfo[] => {
        const status = enrichedReadStatuses.get(messageId)
        return status?.readBy || []
    }

    const shouldShowReadReceipts = (messageId: MessageId): boolean => {
        const isAbsoluteLastMessage = messageId === lastMessageId
        const isFromCurrentUser = isLastMessageFromUser
        const readers = findMessageReaders(messageId)
        return isAbsoluteLastMessage && isFromCurrentUser && readers.length > 0
    }

    return {
        readStatuses,
        isLoading: readStatusQuery.isFetching,
        error: readStatusQuery.error instanceof Error ? readStatusQuery.error.message : null,
        shouldShowSeen,
        shouldShowReadReceipts,
        findMessageReaders,
        markConversationAsRead,
        loadReadStatuses,
    }
}
