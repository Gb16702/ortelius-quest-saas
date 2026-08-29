import * as v from "valibot"

/**
 * Connection states
 */
export const ConnectionStateSchema = v.picklist([
    "disconnected",
    "connecting",
    "connected",
    "reconnecting",
    "error",
])

export type ConnectionState = v.InferOutput<typeof ConnectionStateSchema>

/**
 * Connection quality metrics
 */
export const ConnectionQualitySchema = v.picklist(["excellent", "good", "poor", "unknown"])

export type ConnectionQuality = v.InferOutput<typeof ConnectionQualitySchema>

/**
 * Rate limit information
 */
export const RateLimitInfoSchema = v.object({
    message: v.string(),
    retryAfter: v.optional(v.number()),
    timestamp: v.number(),
})

export type RateLimitInfo = v.InferOutput<typeof RateLimitInfoSchema>

/**
 * Connection health metrics
 */
export const ConnectionHealthSchema = v.object({
    quality: ConnectionQualitySchema,
    latency: v.optional(v.number()),
    uptime: v.number(),
    reconnectAttempts: v.number(),
})

export type ConnectionHealth = v.InferOutput<typeof ConnectionHealthSchema>

/**
 * Connection statistics
 */
export const ConnectionStatsSchema = v.object({
    isConnected: v.boolean(),
    connectionAttempts: v.number(),
    queuedMessages: v.number(),
    lastError: v.nullable(v.string()),
    uptime: v.number(),
    connectionQuality: ConnectionQualitySchema,
})

export type ConnectionStats = v.InferOutput<typeof ConnectionStatsSchema>

/**
 * Server-side WebSocket connection metadata
 */
export interface CustomWebSocket extends WebSocket {
    userId: string
    connectionId: string
    instanceId?: string
    lastPong?: number
    isAlive?: boolean
    pingInterval?: ReturnType<typeof setInterval>
    connectTime?: number
    clientIP?: string
    throttleConnectionId?: string
    cleanupRegistered?: boolean
}
