import type React from "react"
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { publicEnv } from "@/shared/config/env"
import { logError } from "@/shared/lib/error"
import type {
    ConnectionHealth,
    ConnectionState,
    ConnectionStats,
    IncomingWebSocketMessage,
    RateLimitInfo,
    WebSocketContextValue,
    WebSocketMessage,
} from "./web-socket"
import { WebSocketManager } from "./web-socket-manager"

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

interface WebSocketProviderProps {
    children: React.ReactNode
    wsUrl?: string
    options?: {
        reconnectInterval?: number
        maxReconnectAttempts?: number
        heartbeatInterval?: number
    }
}

export function WebSocketProvider({
    children,
    wsUrl = `${publicEnv.WS_URL}/api/ws`,
    options = {},
}: WebSocketProviderProps) {
    const {
        reconnectInterval = 1000,
        maxReconnectAttempts = 10,
        heartbeatInterval = 30000,
    } = options

    const [isConnected, setIsConnected] = useState(false)
    const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
    const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
        isConnected: false,
        connectionAttempts: 0,
        queuedMessages: 0,
        lastError: null,
        uptime: 0,
        connectionQuality: "unknown",
    })
    const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
    const [queuedMessagesCount, setQueuedMessagesCount] = useState(0)
    const [isOffline, setIsOffline] = useState(false)

    const subscribersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set())
    const statsUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const notifySubscribers = useCallback((message: WebSocketMessage) => {
        setLastMessage(message)
        for (const callback of subscribersRef.current) {
            try {
                callback(message)
            } catch (error) {
                logError("WebSocket subscriber callback failed", error)
            }
        }
    }, [])

    // Initialize WebSocketManager synchronously on first render (not in useEffect)
    // This ensures it's ready before any child components try to connect
    const initializedRef = useRef(false)
    if (!initializedRef.current && typeof window !== "undefined") {
        initializedRef.current = true

        WebSocketManager.initialize(wsUrl, {
            maxReconnectAttempts,
            initialReconnectDelay: reconnectInterval,
            heartbeatInterval,
            autoReconnect: true,
        })
    }

    // Subscribe to WebSocket events in useEffect to avoid setState during render
    useEffect(() => {
        const unsubscribeOpen = WebSocketManager.onOpen(() => {
            setIsConnected(true)
            setConnectionError(null)
        })

        const unsubscribeClose = WebSocketManager.onClose(() => {
            setIsConnected(false)
        })

        const unsubscribeError = WebSocketManager.onError(() => {
            setConnectionError("WebSocket connection error")
        })

        const unsubscribeMessage = WebSocketManager.onMessage((message) => {
            notifySubscribers(message)
        })

        const unsubscribeStateChange = WebSocketManager.onStateChange((state) => {
            setConnectionState(state)
            setIsConnected(state === "connected")
            if (state === "connected") {
                setConnectionError(null)
                setRateLimitInfo(null)
            }
        })

        const unsubscribeRateLimit = WebSocketManager.onRateLimit(({ message, retryAfter }) => {
            setRateLimitInfo({
                message,
                retryAfter,
                timestamp: Date.now(),
            })
            notifySubscribers({
                type: "error",
                message,
                timestamp: new Date().toISOString(),
            })
        })

        const unsubscribeReconnecting = WebSocketManager.onReconnecting((attempt) => {
            setConnectionError(`Reconnecting... (attempt ${attempt}/${maxReconnectAttempts})`)
        })

        const unsubscribeReconnected = WebSocketManager.onReconnected(() => {
            setConnectionError(null)
        })

        const unsubscribeMaxReconnect = WebSocketManager.onMaxReconnectAttempts(() => {
            setConnectionError("Failed to reconnect after multiple attempts")
            setConnectionState("error")
        })

        return () => {
            unsubscribeOpen()
            unsubscribeClose()
            unsubscribeError()
            unsubscribeMessage()
            unsubscribeStateChange()
            unsubscribeRateLimit()
            unsubscribeReconnecting()
            unsubscribeReconnected()
            unsubscribeMaxReconnect()
        }
    }, [maxReconnectAttempts, notifySubscribers])

    useEffect(() => {
        const onOnline = () => {
            setIsOffline(false)
            if (!WebSocketManager.isConnected) {
                WebSocketManager.reset()
            }
        }

        const onOffline = () => {
            setIsOffline(true)
        }

        if (typeof window !== "undefined") {
            setIsOffline(!navigator.onLine)
            window.addEventListener("online", onOnline)
            window.addEventListener("offline", onOffline)

            return () => {
                window.removeEventListener("online", onOnline)
                window.removeEventListener("offline", onOffline)
            }
        }
    }, [])

    useEffect(() => {
        statsUpdateIntervalRef.current = setInterval(() => {
            const client = WebSocketManager.getClient()
            if (client) {
                const stats = client.getConnectionStats()
                setConnectionStats(stats)
                setQueuedMessagesCount(stats.queuedMessages)
            }
        }, 5000)

        return () => {
            if (statsUpdateIntervalRef.current) {
                clearInterval(statsUpdateIntervalRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (rateLimitInfo) {
            const timeout = setTimeout(
                () => {
                    setRateLimitInfo(null)
                },
                (rateLimitInfo.retryAfter || 60) * 1000
            )

            return () => clearTimeout(timeout)
        }
    }, [rateLimitInfo])

    const connect = useCallback(
        (userId: string, getAuthTicket?: () => string | null | Promise<string | null>) => {
            if (typeof window === "undefined") return
            WebSocketManager.connect(userId, getAuthTicket)
        },
        []
    )

    const disconnect = useCallback(() => {
        WebSocketManager.disconnect()
        setIsConnected(false)
        setConnectionState("disconnected")
        setConnectionError(null)
        setRateLimitInfo(null)
        setQueuedMessagesCount(0)
    }, [])

    const sendMessage = useCallback((message: IncomingWebSocketMessage): boolean => {
        return WebSocketManager.send(message)
    }, [])

    const subscribe = useCallback((callback: (message: WebSocketMessage) => void) => {
        subscribersRef.current.add(callback)

        return () => {
            subscribersRef.current.delete(callback)
        }
    }, [])

    const reset = useCallback(() => {
        WebSocketManager.reset()
        setConnectionError(null)
        setRateLimitInfo(null)
    }, [])

    const clearQueue = useCallback(() => {
        WebSocketManager.clearQueue()
        setQueuedMessagesCount(0)
    }, [])

    const getConnectionHealth = useCallback((): ConnectionHealth => {
        const client = WebSocketManager.getClient()
        const stats = client?.getConnectionStats() || connectionStats

        return {
            quality: stats.connectionQuality,
            latency:
                stats.connectionQuality !== "unknown"
                    ? stats.connectionQuality === "excellent"
                        ? 50
                        : stats.connectionQuality === "good"
                          ? 200
                          : 400
                    : undefined,
            uptime: stats.uptime,
            reconnectAttempts: stats.connectionAttempts,
        }
    }, [connectionStats])

    useEffect(() => {
        return () => {
            if (statsUpdateIntervalRef.current) {
                clearInterval(statsUpdateIntervalRef.current)
            }
        }
    }, [])

    const contextValue = useMemo<WebSocketContextValue>(
        () => ({
            isConnected,
            connectionState,
            connectionError,
            lastMessage,
            connectionStats,
            rateLimitInfo,
            queuedMessagesCount,
            connect,
            disconnect,
            sendMessage,
            subscribe,
            reset,
            clearQueue,
            getConnectionHealth,
            isOffline,
            hasQueuedMessages: queuedMessagesCount > 0,
        }),
        [
            isConnected,
            connectionState,
            connectionError,
            lastMessage,
            connectionStats,
            rateLimitInfo,
            queuedMessagesCount,
            connect,
            disconnect,
            sendMessage,
            subscribe,
            reset,
            clearQueue,
            getConnectionHealth,
            isOffline,
        ]
    )

    return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>
}

export function useWebSocket(): WebSocketContextValue {
    const context = use(WebSocketContext)

    if (!context) {
        throw new Error("useWebSocket must be used within a WebSocketProvider")
    }

    return context
}
