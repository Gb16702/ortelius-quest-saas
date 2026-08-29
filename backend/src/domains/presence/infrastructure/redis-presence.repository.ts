import { RedisChannels, redisService } from '../../../infrastructure/cache/redis.service'
import type { PresenceEventsPort, PresenceRepositoryPort } from '../application/ports'
import type { PresenceData, PresenceStatus, PresenceUpdatedEvent } from '../domain/presence.types'

const PRESENCE_KEY_PREFIX = 'presence:user:'
const ONLINE_USERS_KEY = 'presence:online'

function parsePresenceData(data: Record<string, string> | null): PresenceData | null {
  if (!data || Object.keys(data).length === 0) return null

  return {
    status: data.status as PresenceStatus,
    lastActiveAt: Number(data.lastActiveAt),
    instanceId: data.instanceId,
  }
}

export class RedisPresenceRepository implements PresenceRepositoryPort {
  async saveOnline(userId: string, data: PresenceData): Promise<void> {
    const client = redisService.getClient('cache')

    await Promise.all([
      client.hset(`${PRESENCE_KEY_PREFIX}${userId}`, data as unknown as Record<string, string>),
      client.sadd(ONLINE_USERS_KEY, userId),
    ])
  }

  async removeOnline(userId: string): Promise<void> {
    const client = redisService.getClient('cache')

    await Promise.all([
      client.del(`${PRESENCE_KEY_PREFIX}${userId}`),
      client.srem(ONLINE_USERS_KEY, userId),
    ])
  }

  async updateActivity(userId: string, lastActiveAt: number): Promise<void> {
    const client = redisService.getClient('cache')
    const exists = await client.exists(`${PRESENCE_KEY_PREFIX}${userId}`)

    if (exists) {
      await client.hset(`${PRESENCE_KEY_PREFIX}${userId}`, 'lastActiveAt', lastActiveAt.toString())
    }
  }

  async getPresenceData(userId: string): Promise<PresenceData | null> {
    const client = redisService.getClient('cache')
    return parsePresenceData(await client.hgetall(`${PRESENCE_KEY_PREFIX}${userId}`))
  }

  async getBatchPresenceData(userIds: string[]): Promise<Map<string, PresenceData | null>> {
    const result = new Map<string, PresenceData | null>()
    if (userIds.length === 0) return result

    const client = redisService.getClient('cache')
    const pipeline = client.pipeline()
    for (const userId of userIds) {
      pipeline.hgetall(`${PRESENCE_KEY_PREFIX}${userId}`)
    }

    const responses = await pipeline.exec()
    if (!responses) return result

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i]
      const [err, data] = responses[i] as [Error | null, Record<string, string> | null]
      result.set(userId, err ? null : parsePresenceData(data))
    }

    return result
  }

  async getOnlineUserIds(): Promise<string[]> {
    return redisService.getClient('cache').smembers(ONLINE_USERS_KEY)
  }
}

export class RedisPresenceEvents implements PresenceEventsPort {
  async publishPresenceUpdated(event: PresenceUpdatedEvent): Promise<void> {
    await redisService.publish(RedisChannels.USER_PRESENCE, {
      type: 'presence:update',
      ...event,
    })
  }

  async subscribeToPresenceUpdates(callback: (event: PresenceUpdatedEvent) => void): Promise<void> {
    await redisService.subscribe(RedisChannels.USER_PRESENCE, (message) => {
      const event = message as {
        type: string
        userId: string
        status: PresenceStatus
        lastActiveAt: string
      }

      if (event.type === 'presence:update') {
        callback({
          userId: event.userId,
          status: event.status,
          lastActiveAt: event.lastActiveAt,
        })
      }
    })
  }
}

export const redisPresenceRepository = new RedisPresenceRepository()
export const redisPresenceEvents = new RedisPresenceEvents()
