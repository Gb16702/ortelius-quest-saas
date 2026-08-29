import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { parseEmptySuccessResponse, readJsonResponse } from "@/shared/api/http.response"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { chatKeys } from "../../api/chat.query-keys"
import {
    chatApiErrorResponseSchema,
    type PinnedMessage,
    pinnedMessagesResponseSchema,
} from "../schemas/chats.schema"

function getChatErrorMessage(payload: unknown, fallback: string): string {
    const result = safeParseSchema(chatApiErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.data.message || fallback
}

interface UsePinnedMessagesOptions {
    enabled?: boolean
}

export function usePinnedMessages(
    conversationId: string,
    { enabled = true }: UsePinnedMessagesOptions = {}
) {
    const queryClient = useQueryClient()

    const pinnedMessagesQuery = useQuery({
        queryKey: chatKeys.pinnedMessages(conversationId),
        enabled: Boolean(conversationId && enabled),
        staleTime: 60_000,
        refetchOnReconnect: "always" as const,
        refetchOnWindowFocus: false,
        queryFn: async ({ signal }) => {
            const res = await fetch(`/api/conversations/${conversationId}/messages/pinned`, {
                credentials: "include",
                signal,
            })
            const json = await readJsonResponse(res)

            if (!res.ok) {
                throw new Error(getChatErrorMessage(json, "Failed to fetch pinned messages"))
            }

            return parseSchema(pinnedMessagesResponseSchema, json).data?.messages ?? []
        },
    })

    const setMessagePinnedState = useCallback(async (messageId: string, isPinned: boolean) => {
        const res = await fetch(`/api/messages/${messageId}/pin`, {
            method: isPinned ? "POST" : "DELETE",
            credentials: "include",
        })

        await parseEmptySuccessResponse(
            res,
            isPinned ? "Failed to pin message" : "Failed to unpin message"
        )
    }, [])

    const removePinnedMessageFromCache = useCallback(
        (messageId: string) => {
            queryClient.setQueryData<PinnedMessage[]>(
                chatKeys.pinnedMessages(conversationId),
                (prev = []) => prev.filter((m) => m.id !== messageId)
            )
        },
        [conversationId, queryClient]
    )

    const refreshPinnedMessages = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: chatKeys.pinnedMessages(conversationId),
        })
    }, [conversationId, queryClient])

    return {
        pinnedMessages: pinnedMessagesQuery.data ?? [],
        isLoading: pinnedMessagesQuery.isFetching,
        setMessagePinnedState,
        removePinnedMessageFromCache,
        refreshPinnedMessages,
        refetch: pinnedMessagesQuery.refetch,
    }
}
