import {
    NewMessageMessageSchema,
    SetActiveConversationMessageSchema,
} from "@ortelius/websocket-types/messages"
import {
    createContext,
    type ReactNode,
    use,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { useUser } from "@/entities/session"
import { readJsonResponse } from "@/shared/api/http.response"
import type { WebSocketMessage } from "@/shared/api/websocket/web-socket"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"
import { logError } from "@/shared/lib/error"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    chatApiErrorResponseSchema,
    unreadConversationsResponseSchema,
} from "./schemas/chats.schema"

const UNREAD_CONVERSATIONS_REFETCH_INTERVAL_MS = 5 * 60 * 1000

interface UnreadConversationsContextType {
    unreadCount: number
    isLoading: boolean
    refreshUnreadCount: () => void
    markConversationAsRead: (conversationId: string) => void
    incrementUnreadCount: () => void
}

const UnreadConversationsContext = createContext<UnreadConversationsContextType | undefined>(
    undefined
)

export function useUnreadConversations() {
    const context = use(UnreadConversationsContext)
    if (context === undefined) {
        throw new Error("useUnreadConversations must be used within an UnreadConversationsProvider")
    }
    return context
}

interface UnreadConversationsProviderProps {
    children: ReactNode
}

function getUnreadConversationsErrorMessage(payload: unknown): string {
    const result = safeParseSchema(chatApiErrorResponseSchema, payload)
    if (!result.success) return "Failed to fetch unread count"
    return result.data.message || "Failed to fetch unread count"
}

export function shouldRefreshUnreadConversations({
    currentUserId,
    fetchedUserId,
    lastFetchedAt,
    now,
    minimumIntervalMs = UNREAD_CONVERSATIONS_REFETCH_INTERVAL_MS,
}: {
    currentUserId: string | undefined
    fetchedUserId: string | null
    lastFetchedAt: number | null
    now: number
    minimumIntervalMs?: number
}): boolean {
    if (!currentUserId) return false
    if (fetchedUserId !== currentUserId) return true
    if (lastFetchedAt === null) return true

    return now - lastFetchedAt >= minimumIntervalMs
}

export function UnreadConversationsProvider({ children }: UnreadConversationsProviderProps) {
    const { isConnected, subscribe } = useWebSocket()
    const user = useUser()
    const userId = user?.id
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const activeConversationIdRef = useRef<string | null>(null)
    const unreadConversationsRef = useRef<Set<string>>(new Set())
    const fetchedUserIdRef = useRef<string | null>(null)
    const lastFetchedAtRef = useRef<number | null>(null)

    const fetchUnreadCount = useCallback(
        async (options: { showLoading?: boolean } = {}) => {
            if (!userId) {
                fetchedUserIdRef.current = null
                lastFetchedAtRef.current = null
                unreadConversationsRef.current = new Set()
                setUnreadCount(0)
                setIsLoading(false)
                return
            }

            if (options.showLoading ?? false) {
                setIsLoading(true)
            }

            try {
                const res = await fetch(`/api/conversations/unread-count`, {
                    credentials: "include",
                })

                const json = await readJsonResponse(res)
                if (!res.ok) throw new Error(getUnreadConversationsErrorMessage(json))

                const parsed = parseSchema(unreadConversationsResponseSchema, json)
                if (parsed.success) {
                    const count = parsed.data?.count ?? 0
                    const conversationIds = parsed.data?.conversationIds ?? []
                    setUnreadCount(count)
                    unreadConversationsRef.current = new Set(conversationIds)
                    fetchedUserIdRef.current = userId
                    lastFetchedAtRef.current = Date.now()
                }
            } catch (error) {
                logError("Failed to fetch unread conversations count", error)
                setUnreadCount(0)
            } finally {
                setIsLoading(false)
            }
        },
        [userId]
    )

    useEffect(() => {
        if (!userId) {
            void fetchUnreadCount()
            return
        }

        if (!isConnected) return

        if (
            shouldRefreshUnreadConversations({
                currentUserId: userId,
                fetchedUserId: fetchedUserIdRef.current,
                lastFetchedAt: lastFetchedAtRef.current,
                now: Date.now(),
            })
        ) {
            void fetchUnreadCount({
                showLoading:
                    fetchedUserIdRef.current !== userId || lastFetchedAtRef.current === null,
            })
        }
    }, [isConnected, userId, fetchUnreadCount])

    const markConversationAsRead = useCallback((conversationId: string) => {
        if (unreadConversationsRef.current.has(conversationId)) {
            unreadConversationsRef.current.delete(conversationId)
            setUnreadCount((prev) => {
                const newCount = Math.max(0, prev - 1)
                return newCount
            })
        }
    }, [])

    const incrementUnreadCount = useCallback(() => {
        setUnreadCount((prev) => prev + 1)
    }, [])

    const refreshUnreadCount = useCallback(() => {
        fetchUnreadCount()
    }, [fetchUnreadCount])

    useEffect(() => {
        if (!userId || !isConnected) return

        const refreshIfStale = () => {
            if (
                shouldRefreshUnreadConversations({
                    currentUserId: userId,
                    fetchedUserId: fetchedUserIdRef.current,
                    lastFetchedAt: lastFetchedAtRef.current,
                    now: Date.now(),
                })
            ) {
                void fetchUnreadCount()
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refreshIfStale()
            }
        }

        window.addEventListener("focus", refreshIfStale)
        document.addEventListener("visibilitychange", handleVisibilityChange)

        return () => {
            window.removeEventListener("focus", refreshIfStale)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
        }
    }, [fetchUnreadCount, isConnected, userId])

    const handleActiveConversationMessage = useCallback((message: WebSocketMessage) => {
        const result = safeParseSchema(SetActiveConversationMessageSchema, message)
        if (!result.success) {
            logError("Invalid conversation:set_active WebSocket payload", result.error)
            return
        }

        const conversationId = result.data.conversationId
        activeConversationIdRef.current = conversationId

        if (conversationId && unreadConversationsRef.current.has(conversationId)) {
            unreadConversationsRef.current.delete(conversationId)
            setUnreadCount((prev) => Math.max(0, prev - 1))
        }
    }, [])

    const handleNewMessage = useCallback(
        (message: WebSocketMessage) => {
            const result = safeParseSchema(NewMessageMessageSchema, message)
            if (!result.success) {
                logError("Invalid message:new WebSocket payload", result.error)
                return
            }

            const { conversationId, data } = result.data
            const senderId = data.senderId

            if (senderId === userId) {
                return
            }

            if (activeConversationIdRef.current === conversationId) {
                return
            }

            if (!unreadConversationsRef.current.has(conversationId)) {
                unreadConversationsRef.current.add(conversationId)
                setUnreadCount((prev) => prev + 1)
            }
        },
        [userId]
    )

    useEffect(() => {
        if (!isConnected || !userId) {
            return
        }

        const unsubscribe = subscribe((message) => {
            if (message.type === "conversation:set_active") {
                handleActiveConversationMessage(message)
                return
            }

            if (message.type === "message:new") {
                handleNewMessage(message)
            }
        })

        return unsubscribe
    }, [subscribe, isConnected, userId, handleActiveConversationMessage, handleNewMessage])

    const value = useMemo<UnreadConversationsContextType>(
        () => ({
            unreadCount,
            isLoading,
            refreshUnreadCount,
            markConversationAsRead,
            incrementUnreadCount,
        }),
        [unreadCount, isLoading, refreshUnreadCount, markConversationAsRead, incrementUnreadCount]
    )

    return (
        <UnreadConversationsContext.Provider value={value}>
            {children}
        </UnreadConversationsContext.Provider>
    )
}
