import { IncomingMessageSchema, OutgoingMessageSchema } from "@ortelius/websocket-types/messages"
import { logError } from "@/shared/lib/error"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type {
    ConnectionState,
    ConnectionStats,
    IncomingWebSocketMessage,
    OutgoingWebSocketMessage,
    QueuedMessage,
    WebSocketClientOptions,
} from "./web-socket"

function isPromiseLike<T>(value: unknown): value is Promise<T> {
    return Boolean(value && typeof (value as { then?: unknown }).then === "function")
}

const ephemeralQueuedMessageTypes = new Set([
    "chat:typing",
    "presence:subscribe",
    "presence:unsubscribe",
])

const CLIENT_HEARTBEAT_TIMEOUT_CLOSE_CODE = 4000

function isEphemeralQueuedMessage(message: IncomingWebSocketMessage): boolean {
    return ephemeralQueuedMessageTypes.has(message.type)
}

export class WebSocketClient {
    private ws: WebSocket | null = null
    private options: Required<WebSocketClientOptions>
    private reconnectAttempts = 0
    private reconnectTimeout: NodeJS.Timeout | null = null
    private heartbeatInterval: NodeJS.Timeout | null = null
    private heartbeatTimeout: NodeJS.Timeout | null = null
    private isReconnecting = false
    private isIntentionallyClosed = false
    private connectionGeneration = 0
    private lastPong = 0
    private connectTime = 0
    private connectionState: ConnectionState = "disconnected"

    private messageQueue: QueuedMessage[] = []
    private readonly maxQueueSize = 100
    private readonly maxRetryAttempts = 3

    private latencyHistory: number[] = []
    private pingStartTime = 0
    private lastError: string | null = null

    constructor(options: WebSocketClientOptions) {
        this.options = {
            protocols: [],
            maxReconnectAttempts: 10,
            initialReconnectDelay: 1000,
            maxReconnectDelay: 30000,
            reconnectBackoffFactor: 1.5,
            heartbeatInterval: 30000,
            heartbeatTimeout: 10000,
            autoReconnect: true,
            getAuthTicket: () => null,
            onOpen: () => {},
            onClose: () => {},
            onError: () => {},
            onMessage: () => {},
            onReconnecting: () => {},
            onReconnected: () => {},
            onMaxReconnectAttemptsReached: () => {},
            onRateLimit: () => {},
            onConnectionStateChange: () => {},
            ...options,
        }
    }

    private authTicket: string | null = null

    setAuthTicket(ticket: string): void {
        this.authTicket = ticket
    }

    setAuthTicketProvider(provider: () => string | null | Promise<string | null>): void {
        this.options.getAuthTicket = provider
    }

    connect(): void {
        if (
            this.ws &&
            (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)
        ) {
            console.warn("[WS] Already connecting or connected, skipping")
            return
        }

        const connectionGeneration = ++this.connectionGeneration
        this.isIntentionallyClosed = false
        this.updateConnectionState("connecting")

        try {
            const ticket = this.options.getAuthTicket()
            if (isPromiseLike<string | null>(ticket)) {
                void ticket
                    .then((resolvedTicket) => {
                        if (this.isCurrentConnectionAttempt(connectionGeneration)) {
                            this.open(resolvedTicket, connectionGeneration)
                        }
                    })
                    .catch((error) => {
                        if (!this.isCurrentConnectionAttempt(connectionGeneration)) {
                            return
                        }

                        logError("Failed to fetch WebSocket ticket", error)
                        this.lastError = "Unable to authorize WebSocket connection"
                        this.attemptReconnection()
                    })
                return
            }

            this.open(ticket ?? this.authTicket, connectionGeneration)
        } catch (error) {
            logError("Failed to fetch WebSocket ticket", error)
            this.lastError = "Unable to authorize WebSocket connection"
            this.attemptReconnection()
        }
    }

    private isCurrentConnectionAttempt(connectionGeneration: number): boolean {
        return this.connectionGeneration === connectionGeneration && !this.isIntentionallyClosed
    }

    private open(ticket: string | null, connectionGeneration: number): void {
        if (!this.isCurrentConnectionAttempt(connectionGeneration)) {
            return
        }

        try {
            let url = this.options.url
            if (ticket) {
                this.authTicket = ticket
                const separator = url.includes("?") ? "&" : "?"
                url = `${url}${separator}ticket=${encodeURIComponent(ticket)}`
            }
            this.ws = new WebSocket(url, this.options.protocols)
            this.setupEventHandlers(connectionGeneration)
        } catch (error) {
            logError("Failed to create WebSocket connection", error)
            this.lastError = `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`
            this.attemptReconnection()
        }
    }

    private updateConnectionState(newState: ConnectionState): void {
        if (this.connectionState !== newState) {
            this.connectionState = newState
            this.options.onConnectionStateChange(newState)
        }
    }

    private setupEventHandlers(connectionGeneration: number): void {
        if (!this.ws) {
            return
        }

        this.ws.onopen = (event) => {
            if (!this.isCurrentConnectionAttempt(connectionGeneration)) {
                return
            }

            // Capture the previous reconnecting state before resetting it —
            // the original code reset isReconnecting to false on line 1, then
            // checked `if (this.isReconnecting)` on line 7, so onReconnected
            // could never fire.
            const wasReconnecting = this.isReconnecting

            this.connectTime = Date.now()
            this.reconnectAttempts = 0
            this.isReconnecting = false
            this.lastPong = Date.now()
            this.lastError = null
            this.updateConnectionState("connected")
            this.startHeartbeat()
            this.flushMessageQueue()

            if (wasReconnecting) {
                this.options.onReconnected()
            }

            this.options.onOpen(event)
        }

        this.ws.onclose = (event) => {
            if (this.connectionGeneration !== connectionGeneration) {
                return
            }

            this.stopHeartbeat()

            if (event.code === 1001 && event.reason === "Server shutdown") {
                this.updateConnectionState("disconnected")
                this.options.onClose(event)
                return
            }

            if (!this.isIntentionallyClosed && this.options.autoReconnect) {
                this.attemptReconnection()
            } else {
                this.updateConnectionState("disconnected")
            }

            this.options.onClose(event)
        }

        this.ws.onerror = (event) => {
            if (!this.isCurrentConnectionAttempt(connectionGeneration)) {
                return
            }

            this.lastError = "WebSocket connection error"
            this.updateConnectionState("error")
            this.options.onError(event)
        }

        this.ws.onmessage = (event) => {
            if (!this.isCurrentConnectionAttempt(connectionGeneration)) {
                return
            }

            if (typeof event.data !== "string") {
                this.lastError = "Invalid message payload"
                logError("Invalid WebSocket message payload", event.data)
                return
            }

            try {
                const result = safeParseSchema(OutgoingMessageSchema, JSON.parse(event.data))
                if (!result.success) {
                    this.lastError = "Invalid message shape"
                    logError("Invalid WebSocket message shape", result.error)
                    return
                }

                const data: OutgoingWebSocketMessage = result.data

                if (data.type === "connection:ping") {
                    this.processServerPing()
                    return
                }

                if (
                    data.type === "error" &&
                    typeof data.message === "string" &&
                    data.message.includes("Rate limit")
                ) {
                    const retryMatch = data.message.match(/Try again in (\d+) seconds/)
                    const retryAfter = retryMatch ? Number.parseInt(retryMatch[1], 10) : undefined
                    this.options.onRateLimit(data.message, retryAfter)
                    return
                }

                if (data.type === "connection:shutdown") {
                    this.isIntentionallyClosed = true
                    return
                }

                this.options.onMessage(data)
            } catch (_error) {
                this.lastError = "Message parsing error"
            }
        }
    }

    private startHeartbeat(): void {
        this.stopHeartbeat()

        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                const timeSinceLastPong = Date.now() - this.lastPong

                if (
                    timeSinceLastPong >
                    this.options.heartbeatInterval * 2 + this.options.heartbeatTimeout
                ) {
                    console.warn(
                        `No server_ping received for ${timeSinceLastPong}ms, closing connection`
                    )
                    this.ws.close(
                        CLIENT_HEARTBEAT_TIMEOUT_CLOSE_CODE,
                        "Heartbeat timeout - no server ping"
                    )
                    return
                }
            }
        }, this.options.heartbeatInterval)
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }

        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout)
            this.heartbeatTimeout = null
        }
    }

    private sendPong(): void {
        const sendTime = Date.now()
        if (this.pingStartTime > 0) {
            const latency = sendTime - this.pingStartTime
            this.latencyHistory.push(latency)

            if (this.latencyHistory.length > 10) {
                this.latencyHistory.shift()
            }

            this.pingStartTime = 0
        }

        this.send({
            type: "connection:pong",
            timestamp: new Date().toISOString(),
        })
    }

    private processServerPing(): void {
        this.pingStartTime = Date.now()
        this.lastPong = Date.now()
        this.sendPong()
    }

    private attemptReconnection(): void {
        if (!this.options.autoReconnect || this.isIntentionallyClosed) {
            return
        }

        if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            this.lastError = "Maximum reconnection attempts reached"
            this.updateConnectionState("error")
            this.options.onMaxReconnectAttemptsReached()
            return
        }

        this.isReconnecting = true
        this.reconnectAttempts++
        this.updateConnectionState("reconnecting")

        const baseDelay = Math.min(
            this.options.initialReconnectDelay *
                this.options.reconnectBackoffFactor ** (this.reconnectAttempts - 1),
            this.options.maxReconnectDelay
        )

        const jitter = Math.random() * 1000
        const delay = baseDelay + jitter

        this.options.onReconnecting(this.reconnectAttempts)

        this.reconnectTimeout = setTimeout(() => {
            this.connect()
        }, delay)
    }

    send(message: IncomingWebSocketMessage): boolean {
        const parsed = safeParseSchema(IncomingMessageSchema, message)
        if (!parsed.success) {
            this.lastError = "Invalid outgoing message shape"
            logError("Invalid outgoing WebSocket message shape", parsed.error)
            return false
        }

        const validMessage = parsed.data

        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(validMessage))
                return true
            } catch (error) {
                if (!isEphemeralQueuedMessage(validMessage)) {
                    this.queueMessage(validMessage)
                }
                this.lastError = `Send error: ${error instanceof Error ? error.message : "Unknown error"}`
                return false
            }
        } else {
            this.queueMessage(validMessage)
            return false
        }
    }

    private queueMessage(message: IncomingWebSocketMessage): void {
        if (message.type === "ping" || message.type === "connection:pong") {
            return
        }

        if (isEphemeralQueuedMessage(message)) {
            return
        }

        while (this.messageQueue.length >= this.maxQueueSize) {
            this.messageQueue.shift()
            console.warn("Message queue full, removing oldest message")
        }

        this.messageQueue.push({
            message,
            timestamp: Date.now(),
            attempts: 0,
        })
    }

    private flushMessageQueue(): void {
        const queueSize = this.messageQueue.length

        if (queueSize === 0) return

        this.lastError = `Flushing ${queueSize} queued messages`

        const messagesToRetry: QueuedMessage[] = []

        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const queuedMessage = this.messageQueue.shift()
            if (!queuedMessage) break

            try {
                const parsed = safeParseSchema(IncomingMessageSchema, queuedMessage.message)
                if (!parsed.success) {
                    console.warn("Queued WebSocket message discarded: invalid shape")
                    continue
                }
                this.ws.send(JSON.stringify(parsed.data))
            } catch (_error) {
                if (queuedMessage.attempts < this.maxRetryAttempts) {
                    queuedMessage.attempts++
                    messagesToRetry.push(queuedMessage)
                } else {
                    console.warn("Message discarded after max retry attempts")
                }
                break
            }
        }

        this.messageQueue.unshift(...messagesToRetry)
    }

    close(code?: number, reason?: string): void {
        this.connectionGeneration++
        this.isIntentionallyClosed = true
        this.isReconnecting = false
        this.authTicket = null

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null
        }

        this.stopHeartbeat()

        if (this.ws) {
            this.ws.close(code, reason)
            this.ws = null
        }

        this.messageQueue = []
        this.updateConnectionState("disconnected")
    }

    get readyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED
    }

    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN
    }

    get isConnecting(): boolean {
        return this.ws?.readyState === WebSocket.CONNECTING
    }

    get connectionAttempts(): number {
        return this.reconnectAttempts
    }

    get queuedMessages(): number {
        return this.messageQueue.length
    }

    get state(): ConnectionState {
        return this.connectionState
    }

    getConnectionStats(): ConnectionStats {
        const avgLatency =
            this.latencyHistory.length > 0
                ? this.latencyHistory.reduce((sum, lat) => sum + lat, 0) /
                  this.latencyHistory.length
                : 0

        let connectionQuality: "excellent" | "good" | "poor" | "unknown" = "unknown"

        if (this.latencyHistory.length > 0) {
            if (avgLatency < 100) connectionQuality = "excellent"
            else if (avgLatency < 300) connectionQuality = "good"
            else connectionQuality = "poor"
        }

        return {
            isConnected: this.isConnected,
            connectionAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            lastError: this.lastError,
            uptime: this.connectTime > 0 ? Date.now() - this.connectTime : 0,
            connectionQuality,
        }
    }

    clearQueue(): void {
        this.messageQueue = []
    }

    reset(): void {
        this.reconnectAttempts = 0
        this.lastError = null
        this.latencyHistory = []

        if (this.isConnected) {
            this.close(1000, "Connection reset")
        }

        if (this.options.autoReconnect) {
            setTimeout(() => this.connect(), 100)
        }
    }
}
