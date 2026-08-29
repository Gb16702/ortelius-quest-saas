import {
    type SignalingAnswerMessage,
    type SignalingIceMessage,
    type SignalingJoinMessage,
    type SignalingLeaveMessage,
    type SignalingMessage,
    SignalingMessageSchema,
    type SignalingMuteMessage,
    type SignalingOfferMessage,
} from "@ortelius/websocket-types/signaling"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

export type CallSignalingConnectionState = {
    connected: boolean
    connecting: boolean
    callId: string | null
    error: Error | null
}

export type CallSignalingConnectionOptions = {
    url: string
    getUrl?: () => string | Promise<string>
    callId: string
    userId: string
    userName?: string
    onMessage: (message: SignalingMessage) => void | Promise<void>
    onConnect?: () => void
    onDisconnect?: () => void
    onError?: (error: Error) => void
}

const RECONNECT_DELAY = 2000
const MAX_RECONNECT_ATTEMPTS = 5

function isPromiseLike<T>(value: unknown): value is Promise<T> {
    return Boolean(value && typeof (value as { then?: unknown }).then === "function")
}

function toError(value: unknown): Error {
    return value instanceof Error ? value : new Error("Unknown signaling error")
}

export class CallSignalingClient {
    private ws: WebSocket | null = null
    private options: CallSignalingConnectionOptions
    private state: CallSignalingConnectionState = {
        connected: false,
        connecting: false,
        callId: null,
        error: null,
    }
    private reconnectAttempts = 0
    private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null
    private messageQueue: SignalingMessage[] = []
    private listeners: Set<(state: CallSignalingConnectionState) => void> = new Set()

    constructor(options: CallSignalingConnectionOptions) {
        this.options = options
        this.state.callId = options.callId
    }

    connect(): void {
        if (this.state.connected || this.state.connecting) {
            return
        }
        this.updateState({ connecting: true, error: null })

        try {
            const url = this.options.getUrl?.() ?? this.options.url
            if (isPromiseLike<string>(url)) {
                void url
                    .then((resolvedUrl) => this.open(resolvedUrl))
                    .catch((error) => this.handleError(toError(error)))
                return
            }

            this.open(url)
        } catch (error) {
            this.handleError(toError(error))
        }
    }

    private open(url: string): void {
        try {
            this.ws = new WebSocket(url)
            this.setupEventListeners()
        } catch (error) {
            this.handleError(toError(error))
        }
    }

    disconnect(): void {
        this.clearReconnectTimeout()
        if (this.ws) {
            this.sendLeave()
            this.ws.close(1000, "Client disconnect")
            this.ws = null
        }
        this.updateState({ connected: false, connecting: false, error: null })
        this.messageQueue = []
        this.reconnectAttempts = 0
        this.options.onDisconnect?.()
    }

    getState(): CallSignalingConnectionState {
        return { ...this.state }
    }

    subscribe(listener: (state: CallSignalingConnectionState) => void): () => void {
        this.listeners.add(listener)
        return () => {
            this.listeners.delete(listener)
        }
    }

    sendOffer(sdp: RTCSessionDescriptionInit): void {
        const message: SignalingOfferMessage = {
            type: "webrtc:offer",
            callId: this.options.callId,
            sdp: sdp.sdp ?? "",
        }
        this.send(message)
    }

    sendAnswer(sdp: RTCSessionDescriptionInit): void {
        const message: SignalingAnswerMessage = {
            type: "webrtc:answer",
            callId: this.options.callId,
            sdp: sdp.sdp ?? "",
        }
        this.send(message)
    }

    sendIceCandidate(candidate: RTCIceCandidateInit): void {
        const message: SignalingIceMessage = {
            type: "webrtc:ice",
            callId: this.options.callId,
            candidate: candidate.candidate ?? "",
            sdpMid: candidate.sdpMid ?? null,
            sdpMLineIndex: candidate.sdpMLineIndex ?? null,
        }
        this.send(message)
    }

    sendMuteStatus(isMuted: boolean): void {
        const message: SignalingMuteMessage = {
            type: "participant:mute",
            callId: this.options.callId,
            isMuted,
        }
        this.send(message)
    }

    join(): void {
        const message: SignalingJoinMessage = {
            type: "call:join",
            callId: this.options.callId,
            userId: this.options.userId,
            userName: this.options.userName,
        }
        this.send(message)
    }

    private sendLeave(): void {
        if (!this.state.connected) return
        const message: SignalingLeaveMessage = {
            type: "call:leave",
            callId: this.options.callId,
            userId: this.options.userId,
        }
        this.sendImmediate(message)
    }

    private send(message: SignalingMessage): void {
        if (this.state.connected && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message))
        } else {
            this.messageQueue.push(message)
        }
    }

    private sendImmediate(message: SignalingMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message))
        }
    }

    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift()
            if (message) this.send(message)
        }
    }

    private setupEventListeners(): void {
        if (!this.ws) return

        this.ws.onopen = () => {
            this.updateState({ connected: true, connecting: false, error: null })
            this.reconnectAttempts = 0
            this.flushMessageQueue()
            this.options.onConnect?.()
        }

        this.ws.onclose = (event) => {
            this.updateState({ connected: false, connecting: false })
            if (event.code !== 1000) {
                this.scheduleReconnect()
            }
            this.options.onDisconnect?.()
        }

        this.ws.onerror = () => {
            this.handleError(new Error("WebSocket connection error"))
        }

        this.ws.onmessage = (event) => {
            void this.handleMessage(event)
        }
    }

    private async handleMessage(event: MessageEvent): Promise<void> {
        if (typeof event.data !== "string") {
            console.warn("Invalid signaling message payload:", event.data)
            return
        }

        let payload: unknown
        try {
            payload = JSON.parse(event.data)
        } catch {
            console.warn("Failed to parse signaling message:", event.data)
            return
        }

        const result = safeParseSchema(SignalingMessageSchema, payload)
        if (!result.success) {
            console.warn("Invalid signaling message:", result.error)
            return
        }

        try {
            await this.options.onMessage(result.data)
        } catch (error) {
            this.handleMessageError(toError(error))
        }
    }

    private handleMessageError(error: Error): void {
        this.updateState({ error })
        this.options.onError?.(error)
    }

    private handleError(error: Error): void {
        this.updateState({ connected: false, connecting: false, error })
        this.options.onError?.(error)
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error("Max signaling reconnect attempts reached")
            return
        }
        this.clearReconnectTimeout()
        const delay = RECONNECT_DELAY * 2 ** this.reconnectAttempts
        this.reconnectTimeoutId = setTimeout(() => {
            this.reconnectAttempts++
            this.connect()
        }, delay)
    }

    private clearReconnectTimeout(): void {
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId)
            this.reconnectTimeoutId = null
        }
    }

    private updateState(partial: Partial<CallSignalingConnectionState>): void {
        this.state = { ...this.state, ...partial }
        this.notifyListeners()
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener(this.getState())
        }
    }
}
