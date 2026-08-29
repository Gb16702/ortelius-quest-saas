import IORedis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'

export enum RedisChannels {
  WS_MESSAGES = 'ws:messages',
  USER_PRESENCE = 'user:presence',
  CALL_WS_MESSAGES = 'call:ws:messages',
}

export interface RedisConfig {
  host: string
  port: number
  username?: string
  password?: string
  db?: number
  keyPrefix?: string
  connectionName?: string
  retryStrategy?: (times: number) => number | undefined
  enableReadyCheck?: boolean
  connectTimeout?: number
  reconnectOnError?: (err: Error) => boolean | 1 | 2
}

type RedisClientRole =
  | 'default'
  | 'publisher'
  | 'subscriber'
  | 'cache'
  | 'assistantQueue'
  | 'assistantQueueBlocking'

export class RedisService {
  private static instance: RedisService
  private clients: Map<string, IORedis> = new Map()
  private readonly instanceId: string
  private channelCallbacks: Map<string, Set<(message: unknown) => void>> = new Map()

  private constructor() {
    this.instanceId = uuidv4()
    console.log(`Redis Service initialized with instance ID: ${this.instanceId}`)
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService()
    }
    return RedisService.instance
  }

  public getInstanceId(): string {
    return this.instanceId
  }

  public getClient(role: RedisClientRole = 'default'): IORedis {
    if (this.clients.has(role)) {
      return this.clients.get(role)!
    }

    const config = this.getRedisConfig()
    config.connectionName = `${config.connectionName || 'app'}-${role}-${this.instanceId}`
    const client = new IORedis(config)

    this.setupClientErrorHandling(client, role)
    this.clients.set(role, client)

    return client
  }

  public getPublisher(): IORedis {
    return this.getClient('publisher')
  }

  public getSubscriber(): IORedis {
    return this.getClient('subscriber')
  }

  private setupClientErrorHandling(client: IORedis, role: string): void {
    client.on('error', (err) => {
      console.error(`Redis ${role} client error:`, err)
    })

    client.on('connect', () => {
      console.log(`Redis ${role} client connected`)
    })

    client.on('reconnecting', (ms: number) => {
      console.warn(`Redis ${role} client reconnecting in ${ms}ms`)
    })

    client.on('close', () => {
      console.warn(`Redis ${role} client connection closed`)
    })
  }

  private getRedisConfig(): RedisConfig {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 15000,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(Math.exp(times) * 50, 30000)
        console.log(`Redis reconnection attempt ${times}, delay: ${delay}ms`)
        return delay
      },
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY'
        if (err.message.includes(targetError)) {
          return 1
        }
        return false
      },
      keyPrefix: `quest-${process.env.NODE_ENV || 'development'}:ws:`,
    }
  }

  public async subscribe(channel: string, callback: (message: unknown) => void): Promise<void> {
    const subscriber = this.getSubscriber()

    if (!this.channelCallbacks.has(channel)) {
      this.channelCallbacks.set(channel, new Set())
      await subscriber.subscribe(channel)
    }

    this.channelCallbacks.get(channel)!.add(callback)

    if (this.channelCallbacks.get(channel)!.size === 1) {
      subscriber.on('message', (receivedChannel: string, message: string) => {
        if (receivedChannel !== channel) return

        try {
          const parsedMessage = JSON.parse(message)

          if (parsedMessage.sourceInstanceId === this.instanceId && parsedMessage.excludeSelf) {
            return
          }

          const callbacks = this.channelCallbacks.get(channel)
          if (callbacks) {
            callbacks.forEach((cb) => cb(parsedMessage))
          }
        } catch (error) {
          console.error(`Error processing Redis message from channel ${channel}:`, error)
        }
      })
    }

    console.log(`Subscribed to Redis channel: ${channel}`)
  }

  public async unsubscribe(channel: string, callback?: (message: unknown) => void): Promise<void> {
    if (!this.channelCallbacks.has(channel)) {
      return
    }

    if (callback) {
      this.channelCallbacks.get(channel)!.delete(callback)

      if (this.channelCallbacks.get(channel)!.size === 0) {
        this.channelCallbacks.delete(channel)
        await this.getSubscriber().unsubscribe(channel)
        console.log(`Unsubscribed from Redis channel: ${channel}`)
      }
    } else {
      this.channelCallbacks.delete(channel)
      await this.getSubscriber().unsubscribe(channel)
      console.log(`Unsubscribed from Redis channel: ${channel}`)
    }
  }

  public async publish(
    channel: string,
    message: Record<string, unknown>,
    excludeSelf = false
  ): Promise<void> {
    const messageWithMeta = {
      ...message,
      sourceInstanceId: this.instanceId,
      timestamp: Date.now(),
      excludeSelf,
    }

    await this.getPublisher().publish(channel, JSON.stringify(messageWithMeta))
  }

  public async registerHeartbeat(): Promise<void> {
    const client = this.getClient()
    await client.hset('instances:heartbeat', this.instanceId, Date.now())
  }

  public startHeartbeatService(intervalMs = 30000): NodeJS.Timeout {
    this.registerHeartbeat().catch((err) => {
      console.error('Error registering initial heartbeat:', err)
    })

    return setInterval(() => {
      this.registerHeartbeat().catch((err) => {
        console.error('Error registering heartbeat:', err)
      })
    }, intervalMs)
  }

  public async cleanupDeadInstances(timeoutMs = 90000): Promise<void> {
    const client = this.getClient()
    const now = Date.now()

    try {
      const heartbeats = await client.hgetall('instances:heartbeat')

      for (const [instanceId, lastHeartbeat] of Object.entries(heartbeats)) {
        if (instanceId === this.instanceId) continue

        const lastBeat = Number.parseInt(lastHeartbeat)
        if (now - lastBeat > timeoutMs) {
          console.log(`Cleaning up dead instance: ${instanceId}`)

          await client.hdel('instances:heartbeat', instanceId)
          await client.hdel('instances:users', instanceId)
        }
      }
    } catch (error) {
      console.error('Error cleaning dead instances:', error)
    }
  }

  public startCleanupService(intervalMs = 90000, timeoutMs = 90000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanupDeadInstances(timeoutMs).catch((err) => {
        console.error('Error cleaning up dead instances:', err)
      })
    }, intervalMs)
  }

  public async cleanup(): Promise<void> {
    try {
      const client = this.getClient()

      await client.hdel('instances:heartbeat', this.instanceId)
      await client.hdel('instances:users', this.instanceId)

      for (const [role, client] of this.clients.entries()) {
        console.log(`Closing Redis ${role} client connection...`)
        await client.quit()
      }

      this.clients.clear()
      this.channelCallbacks.clear()

      console.log('Redis service cleanup completed')
    } catch (error) {
      console.error('Error during Redis service cleanup:', error)
    }
  }
}

export const redisService = RedisService.getInstance()
