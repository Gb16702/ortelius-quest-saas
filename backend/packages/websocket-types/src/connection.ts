import { z } from 'zod'

/**
 * Connection states
 */
export const ConnectionStateSchema = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'reconnecting',
  'error',
])

export type ConnectionState = z.infer<typeof ConnectionStateSchema>

/**
 * Connection quality metrics
 */
export const ConnectionQualitySchema = z.enum(['excellent', 'good', 'poor', 'unknown'])

export type ConnectionQuality = z.infer<typeof ConnectionQualitySchema>

/**
 * Rate limit information
 */
export const RateLimitInfoSchema = z.object({
  message: z.string(),
  retryAfter: z.number().optional(),
  timestamp: z.number(),
})

export type RateLimitInfo = z.infer<typeof RateLimitInfoSchema>

/**
 * Connection health metrics
 */
export const ConnectionHealthSchema = z.object({
  quality: ConnectionQualitySchema,
  latency: z.number().optional(),
  uptime: z.number(),
  reconnectAttempts: z.number(),
})

export type ConnectionHealth = z.infer<typeof ConnectionHealthSchema>

/**
 * Connection statistics
 */
export const ConnectionStatsSchema = z.object({
  isConnected: z.boolean(),
  connectionAttempts: z.number(),
  queuedMessages: z.number(),
  lastError: z.string().nullable(),
  uptime: z.number(),
  connectionQuality: ConnectionQualitySchema,
})

export type ConnectionStats = z.infer<typeof ConnectionStatsSchema>

/**
 * Server-side WebSocket connection metadata
 */
export interface CustomWebSocket extends WebSocket {
  userId: string
  connectionId: string
  instanceId?: string
  lastPong?: number
  isAlive?: boolean
  pingInterval?: NodeJS.Timeout
  connectTime?: number
  clientIP?: string
  throttleConnectionId?: string
  cleanupRegistered?: boolean
}
