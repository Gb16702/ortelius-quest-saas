import {
  createOnlinePresence,
  DEFAULT_PRESENCE_TIMEOUT_MS,
  getOfflineLastActiveAt,
  isPresenceInactive,
  type PresenceStatus,
  type PresenceUpdatedEvent,
  toUserPresence,
  type UserPresence,
} from '../domain/presence.types'
import type {
  PresenceClockPort,
  PresenceEventsPort,
  PresenceLastSeenPort,
  PresenceRepositoryPort,
} from './ports'

export class PresenceUseCases {
  constructor(
    private readonly repository: PresenceRepositoryPort,
    private readonly events: PresenceEventsPort,
    private readonly clock: PresenceClockPort = { now: () => Date.now() },
    private readonly lastSeen?: PresenceLastSeenPort
  ) {}

  async setUserOnline(userId: string, instanceId: string): Promise<void> {
    const now = this.clock.now()
    await this.repository.saveOnline(userId, createOnlinePresence(instanceId, now))
    await this.lastSeen?.markUserLastSeen(userId, new Date(now))
    await this.publishUpdate(userId, 'online', new Date(now).toISOString())
  }

  async setUserOffline(userId: string): Promise<void> {
    const now = this.clock.now()
    const data = await this.repository.getPresenceData(userId)
    const lastActiveAt = getOfflineLastActiveAt(data, now)
    await this.repository.removeOnline(userId)
    await this.lastSeen?.markUserLastSeen(userId, new Date(lastActiveAt))
    await this.publishUpdate(userId, 'offline', lastActiveAt)
  }

  async updateActivity(userId: string): Promise<void> {
    await this.repository.updateActivity(userId, this.clock.now())
  }

  async getUserPresence(userId: string): Promise<UserPresence | null> {
    const data = await this.repository.getPresenceData(userId)
    return toUserPresence(userId, data, this.clock.now())
  }

  async getBatchPresence(userIds: string[]): Promise<Map<string, UserPresence>> {
    const result = new Map<string, UserPresence>()
    if (userIds.length === 0) return result

    const now = this.clock.now()
    const records = await this.repository.getBatchPresenceData(userIds)

    for (const userId of userIds) {
      result.set(userId, toUserPresence(userId, records.get(userId), now))
    }

    return result
  }

  async getOnlineUserIds(): Promise<string[]> {
    return this.repository.getOnlineUserIds()
  }

  async cleanupInactiveUsers(timeoutMs: number = DEFAULT_PRESENCE_TIMEOUT_MS): Promise<string[]> {
    const now = this.clock.now()
    const offlineUsers: string[] = []
    const onlineUserIds = await this.repository.getOnlineUserIds()

    for (const userId of onlineUserIds) {
      const data = await this.repository.getPresenceData(userId)

      if (!data) {
        await this.repository.removeOnline(userId)
        offlineUsers.push(userId)
        continue
      }

      if (isPresenceInactive(data, now, timeoutMs)) {
        await this.setUserOffline(userId)
        offlineUsers.push(userId)
      }
    }

    return offlineUsers
  }

  async subscribeToPresenceUpdates(callback: (event: PresenceUpdatedEvent) => void): Promise<void> {
    await this.events.subscribeToPresenceUpdates(callback)
  }

  private async publishUpdate(
    userId: string,
    status: PresenceStatus,
    lastActiveAt: string
  ): Promise<void> {
    await this.events.publishPresenceUpdated({ userId, status, lastActiveAt })
  }
}

export function createPresenceUseCases(dependencies: {
  repository: PresenceRepositoryPort
  events: PresenceEventsPort
  clock?: PresenceClockPort
  lastSeen?: PresenceLastSeenPort
}): PresenceUseCases {
  return new PresenceUseCases(
    dependencies.repository,
    dependencies.events,
    dependencies.clock,
    dependencies.lastSeen
  )
}
