import { useCallback, useEffect, useRef } from "react"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"

interface UseActiveChatConversationOptions {
    conversationId: string | undefined
    userId: string | undefined
    markConversationAsRead: (conversationId: string) => Promise<void>
    onConversationRead: (conversationId: string) => void
    canReadConversation: boolean
}

export function useActiveChatConversation({
    conversationId,
    userId,
    markConversationAsRead,
    onConversationRead,
    canReadConversation,
}: UseActiveChatConversationOptions): void {
    const { sendMessage } = useWebSocket()
    const currentConversationIdRef = useRef<string | null>(null)
    const markedConversationsRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        if (conversationId && sendMessage && canReadConversation) {
            currentConversationIdRef.current = conversationId

            // Participants come from the route loader / conversation list — no
            // need to round-trip via WS. The old `get_conversation_participants`
            // event has been dropped server-side; if you ever need a live
            // refresh, call GET /api/conversations/:id/participants.
            sendMessage({
                type: "conversation:set_active",
                conversationId,
                timestamp: new Date().toISOString(),
            })
        }

        return () => {
            if (sendMessage && currentConversationIdRef.current === conversationId) {
                sendMessage({
                    type: "conversation:set_active",
                    conversationId: null,
                    timestamp: new Date().toISOString(),
                })
                currentConversationIdRef.current = null
            }
        }
    }, [canReadConversation, conversationId, sendMessage])

    const markReadAndApplyLocally = useCallback(
        async (targetConversationId: string, source: string) => {
            try {
                await markConversationAsRead(targetConversationId)
                onConversationRead(targetConversationId)
            } catch (error) {
                console.error(`Failed to mark conversation as read ${source}:`, error)
            }
        },
        [markConversationAsRead, onConversationRead]
    )

    useEffect(() => {
        if (
            !conversationId ||
            !userId ||
            !canReadConversation ||
            markedConversationsRef.current.has(conversationId)
        ) {
            return
        }

        const currentId = conversationId
        let cancelled = false

        markConversationAsRead(currentId)
            .then(() => {
                if (cancelled) return

                onConversationRead(currentId)
                markedConversationsRef.current.add(currentId)
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error("Failed to mark conversation as read:", error)
                }
            })

        return () => {
            cancelled = true
        }
    }, [canReadConversation, conversationId, userId, markConversationAsRead, onConversationRead])

    useEffect(() => {
        const onVisibilityChange = () => {
            if (!document.hidden && conversationId && canReadConversation) {
                void markReadAndApplyLocally(conversationId, "on visibility change")
            }
        }

        document.addEventListener("visibilitychange", onVisibilityChange)

        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange)
        }
    }, [canReadConversation, conversationId, markReadAndApplyLocally])
}
