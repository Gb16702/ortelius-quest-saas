import { logError } from "@/shared/lib/error"
import type {
    ConnectionState,
    IncomingWebSocketMessage,
    WebSocketClientOptions,
    WebSocketMessage,
} from "./web-socket"
import { WebSocketClient } from "./web-socket.client"

type MessageSubscriber = (message: WebSocketMessage) => void
type StateChangeSubscriber = (state: ConnectionState) => void
type EventSubscriber = () => void
type AuthTicketProvider = NonNullable<WebSocketClientOptions["getAuthTicket"]>

interface RateLimitEvent {
    message: string
    retryAfter?: number
}
type RateLimitSubscriber = (event: RateLimitEvent) => void

class WebSocketManagerClass {
    private client: WebSocketClient | null = null
    private messageSubscribers = new Set<MessageSubscriber>()
    private stateChangeSubscribers = new Set<StateChangeSubscriber>()
    private openSubscribers = new Set<EventSubscriber>()
    private closeSubscribers = new Set<EventSubscriber>()
    private errorSubscribers = new Set<EventSubscriber>()
    private rateLimitSubscribers = new Set<RateLimitSubscriber>()
    private reconnectingSubscribers = new Set<(attempt: number) => void>()
    private reconnectedSubscribers = new Set<EventSubscriber>()
    private maxReconnectSubscribers = new Set<EventSubscriber>()
    private currentUserId: string | null = null
    private isInitialized = false

    initialize(
        url: string,
        options: Partial<
            Omit<
                WebSocketClientOptions,
                | "url"
                | "onOpen"
                | "onClose"
                | "onError"
                | "onMessage"
                | "onConnectionStateChange"
                | "onRateLimit"
                | "onReconnecting"
                | "onReconnected"
                | "onMaxReconnectAttemptsReached"
            >
        > = {}
    ): void {
        if (this.isInitialized) {
            return
        }

        this.isInitialized = true

        const defaultOptions: WebSocketClientOptions = {
            url,
            maxReconnectAttempts: 10,
            initialReconnectDelay: 1000,
            maxReconnectDelay: 30000,
            heartbeatInterval: 30000,
            autoReconnect: true,

            onOpen: () => {
                // Notification subscription is now implicit at WS connect
                // (server auto-subscribes the authenticated user). No client
                // round-trip needed.
                for (const subscriber of this.openSubscribers) {
                    subscriber()
                }
            },

            onClose: () => {
                for (const subscriber of this.closeSubscribers) {
                    subscriber()
                }
            },

            onError: () => {
                for (const subscriber of this.errorSubscribers) {
                    subscriber()
                }
            },

            onMessage: (message) => {
                if (
                    message.type === "error" &&
                    typeof message.message === "string" &&
                    message.message.includes("Rate limit")
                ) {
                    return
                }

                for (const subscriber of this.messageSubscribers) {
                    try {
                        subscriber(message)
                    } catch (error) {
                        logError("WebSocket manager subscriber failed", error)
                    }
                }
            },

            onConnectionStateChange: (state) => {
                for (const subscriber of this.stateChangeSubscribers) {
                    subscriber(state)
                }
            },

            onRateLimit: (message, retryAfter) => {
                for (const subscriber of this.rateLimitSubscribers) {
                    subscriber({ message, retryAfter })
                }
            },

            onReconnecting: (attempt) => {
                for (const subscriber of this.reconnectingSubscribers) {
                    subscriber(attempt)
                }
            },

            onReconnected: () => {
                // Auto-subscribed at WS connect; nothing to re-send.
                for (const subscriber of this.reconnectedSubscribers) {
                    subscriber()
                }
            },

            onMaxReconnectAttemptsReached: () => {
                for (const subscriber of this.maxReconnectSubscribers) {
                    subscriber()
                }
            },

            ...options,
        }

        this.client = new WebSocketClient(defaultOptions)
    }

    onMessage(callback: MessageSubscriber): () => void {
        this.messageSubscribers.add(callback)
        return () => this.messageSubscribers.delete(callback)
    }

    onStateChange(callback: StateChangeSubscriber): () => void {
        this.stateChangeSubscribers.add(callback)
        return () => this.stateChangeSubscribers.delete(callback)
    }

    onOpen(callback: EventSubscriber): () => void {
        this.openSubscribers.add(callback)
        return () => this.openSubscribers.delete(callback)
    }

    onClose(callback: EventSubscriber): () => void {
        this.closeSubscribers.add(callback)
        return () => this.closeSubscribers.delete(callback)
    }

    onError(callback: EventSubscriber): () => void {
        this.errorSubscribers.add(callback)
        return () => this.errorSubscribers.delete(callback)
    }

    onRateLimit(callback: RateLimitSubscriber): () => void {
        this.rateLimitSubscribers.add(callback)
        return () => this.rateLimitSubscribers.delete(callback)
    }

    onReconnecting(callback: (attempt: number) => void): () => void {
        this.reconnectingSubscribers.add(callback)
        return () => this.reconnectingSubscribers.delete(callback)
    }

    onReconnected(callback: EventSubscriber): () => void {
        this.reconnectedSubscribers.add(callback)
        return () => this.reconnectedSubscribers.delete(callback)
    }

    onMaxReconnectAttempts(callback: EventSubscriber): () => void {
        this.maxReconnectSubscribers.add(callback)
        return () => this.maxReconnectSubscribers.delete(callback)
    }

    connect(userId: string, getAuthTicket?: AuthTicketProvider): void {
        if (!this.client) {
            return
        }

        const isSameUser = this.currentUserId === userId

        if (isSameUser && this.client.isConnected) {
            return
        }

        if (this.currentUserId && !isSameUser) {
            this.client.close(1000, "User identity changed")
        }

        this.currentUserId = userId

        if (getAuthTicket) {
            this.client.setAuthTicketProvider(getAuthTicket)
        }

        this.client.connect()
    }

    disconnect(): void {
        this.currentUserId = null

        if (this.client) {
            this.client.close(1000, "User disconnected")
        }
    }

    send(message: IncomingWebSocketMessage): boolean {
        if (!this.client) {
            return false
        }

        return this.client.send(message)
    }

    reset(): void {
        if (this.client) {
            this.client.reset()
        }
    }

    clearQueue(): void {
        if (this.client) {
            this.client.clearQueue()
        }
    }

    getClient(): WebSocketClient | null {
        return this.client
    }

    get isConnected(): boolean {
        return this.client?.isConnected ?? false
    }

    get isConnecting(): boolean {
        return this.client?.isConnecting ?? false
    }
}

export const WebSocketManager = new WebSocketManagerClass()
