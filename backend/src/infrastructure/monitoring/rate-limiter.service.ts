import { redisService } from '../cache/redis.service'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyPrefix: string
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const client = redisService.getClient()
    const key = `${this.config.keyPrefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      const pipeline = client.pipeline()
      pipeline.zremrangebyscore(key, 0, windowStart)
      pipeline.zcard(key)
      pipeline.zadd(key, now, `${now}-${Math.random()}`)
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000))

      const results = await pipeline.exec()

      if (!results) {
        throw new Error('Pipeline execution failed')
      }

      const currentCount = results[1][1] as number

      const allowed = currentCount < this.config.maxRequests
      const remaining = Math.max(0, this.config.maxRequests - currentCount - 1)
      const resetTime = windowStart + this.config.windowMs

      const result: RateLimitResult = {
        allowed,
        limit: this.config.maxRequests,
        remaining,
        resetTime,
      }

      if (!allowed) {
        result.retryAfter = Math.ceil((resetTime - now) / 1000)
      }

      return result
    } catch (error) {
      console.error(`Error in rate limiter for ${identifier}:`, error)
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      }
    }
  }

  async reset(identifier: string): Promise<void> {
    try {
      const client = redisService.getClient()
      const key = `${this.config.keyPrefix}:${identifier}`
      await client.del(key)
    } catch (error) {
      console.error(`Error resetting rate limit for ${identifier}:`, error)
    }
  }
}

export const connectionRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'ws_conn_limit',
})

export const messageRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'ws_msg_limit',
})

export const broadcastRateLimiter = new RateLimiter({
  windowMs: 10 * 1000,
  maxRequests: 10,
  keyPrefix: 'ws_broadcast_limit',
})

export const assistantRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'assistant_msg_limit',
})

export interface ConnectionThrottleConfig {
  maxConnectionsPerIP: number
  windowMs: number
  cleanupIntervalMs: number
}

class ConnectionThrottler {
  private connections = new Map<string, Set<string>>()
  private config: ConnectionThrottleConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: ConnectionThrottleConfig) {
    this.config = config
    this.startCleanup()
  }

  canConnect(ip: string): boolean {
    const connections = this.connections.get(ip) || new Set()
    return connections.size < this.config.maxConnectionsPerIP
  }

  addConnection(ip: string, connectionId: string): boolean {
    if (!this.canConnect(ip)) {
      return false
    }

    if (!this.connections.has(ip)) {
      this.connections.set(ip, new Set())
    }

    this.connections.get(ip)!.add(connectionId)
    return true
  }

  removeConnection(ip: string, connectionId: string): void {
    const connections = this.connections.get(ip)
    if (connections) {
      connections.delete(connectionId)
      if (connections.size === 0) {
        this.connections.delete(ip)
      }
    }
  }

  getConnectionCount(ip: string): number {
    return this.connections.get(ip)?.size || 0
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      for (const [ip, connections] of this.connections.entries()) {
        if (connections.size === 0) {
          this.connections.delete(ip)
        }
      }
    }, this.config.cleanupIntervalMs)
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  getStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const [ip, connections] of this.connections.entries()) {
      stats[ip] = connections.size
    }
    return stats
  }
}

export const connectionThrottler = new ConnectionThrottler({
  maxConnectionsPerIP: 10,
  windowMs: 60 * 1000,
  cleanupIntervalMs: 5 * 60 * 1000,
})

export { RateLimiter }
