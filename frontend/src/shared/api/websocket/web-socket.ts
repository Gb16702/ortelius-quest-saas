export type {
    // Base
    BaseMessage as BaseWebSocketMessage,
    CallErrorMessage,
    // Connection
    ConnectionEstablishedMessage,
    ConnectionHealth,
    ConnectionQuality,
    ConnectionState,
    ConnectionStats,
    // Participants
    ConversationParticipantInfo,
    ConversationParticipantsMessage,
    // Custom
    CustomDataMessage,
    // Errors
    ErrorMessage,
    // Direction
    IncomingMessage,
    NewMessageData,
    NewMessageMessage,
    NotificationMessage,
    OrganizationUpdatedData,
    OrganizationUpdatedMessage,
    OutgoingMessage,
    PongMessage,
    RateLimitInfo,
    ServerPingMessage,
    ServerShutdownMessage,
    StatusUpdatedMessage,
    // Presence subscriptions
    SubscribePresenceMessage,
    // Chat
    TypingMessage,
    UnsubscribePresenceMessage,
    VoIPAnswerMessage,
    VoIPCallEndMessage,
    VoIPCallInitiatedMessage,
    // VoIP
    VoIPCallRequestMessage,
    VoIPCallResponseMessage,
    VoIPIceCandidateMessage,
    VoIPMuteStatusMessage,
    VoIPOfferMessage,
    VoIPSpeakerUpdateMessage,
    WebSocketMessage,
} from "@ortelius/websocket-types"

import type {
    ConnectionHealth as CH,
    ConnectionState as CS,
    ConnectionStats as CStat,
    IncomingMessage,
    OutgoingMessage,
    RateLimitInfo as RLI,
    WebSocketMessage as WSMessage,
} from "@ortelius/websocket-types"

export type {
    IncomingMessage as IncomingWebSocketMessage,
    OutgoingMessage as OutgoingWebSocketMessage,
    ServerPingMessage as PingMessage,
} from "@ortelius/websocket-types"

export interface QueuedMessage {
    message: IncomingMessage
    timestamp: number
    attempts: number
}

export interface WebSocketClientOptions {
    url: string
    getAuthTicket?: () => string | null | Promise<string | null>
    protocols?: string[]
    maxReconnectAttempts?: number
    initialReconnectDelay?: number
    maxReconnectDelay?: number
    reconnectBackoffFactor?: number
    heartbeatInterval?: number
    heartbeatTimeout?: number
    autoReconnect?: boolean
    onOpen?: (event: Event) => void
    onClose?: (event: CloseEvent) => void
    onError?: (event: Event) => void
    onMessage?: (data: OutgoingMessage) => void
    onReconnecting?: (attempt: number) => void
    onReconnected?: () => void
    onMaxReconnectAttemptsReached?: () => void
    onRateLimit?: (message: string, retryAfter?: number) => void
    onConnectionStateChange?: (state: CS) => void
}

export interface WebSocketContextValue {
    isConnected: boolean
    connectionState: CS
    connectionError: string | null
    lastMessage: WSMessage | null
    connectionStats: CStat
    rateLimitInfo: RLI | null
    queuedMessagesCount: number
    connect: (userId: string, getAuthTicket?: () => string | null | Promise<string | null>) => void
    disconnect: () => void
    sendMessage: (message: IncomingMessage) => boolean
    subscribe: (callback: (message: WSMessage) => void) => () => void
    reset: () => void
    clearQueue: () => void
    getConnectionHealth: () => CH
    isOffline: boolean
    hasQueuedMessages: boolean
}
