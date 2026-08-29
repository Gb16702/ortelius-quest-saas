import { describe, expect, it } from 'bun:test'
import type {
  PresenceClockPort,
  PresenceEventsPort,
  PresenceLastSeenPort,
  PresenceRepositoryPort,
} from '../application/ports'
import { PresenceUseCases } from '../application/presence-use-cases'
import type { PresenceData, PresenceUpdatedEvent } from '../domain/presence.types'

class FakePresenceRepository implements PresenceRepositoryPort {
  records = new Map<string, PresenceData>()
  online = new Set<string>()

  async saveOnline(userId: string, data: PresenceData): Promise<void> {
    this.records.set(userId, data)
    this.online.add(userId)
  }

  async removeOnline(userId: string): Promise<void> {
    this.records.delete(userId)
    this.online.delete(userId)
  }

  async updateActivity(userId: string, lastActiveAt: number): Promise<void> {
    const data = this.records.get(userId)
    if (data) {
      this.records.set(userId, { ...data, lastActiveAt })
    }
  }

  async getPresenceData(userId: string): Promise<PresenceData | null> {
    return this.records.get(userId) ?? null
  }

  async getBatchPresenceData(userIds: string[]): Promise<Map<string, PresenceData | null>> {
    return new Map(userIds.map((userId) => [userId, this.records.get(userId) ?? null]))
  }

  async getOnlineUserIds(): Promise<string[]> {
    return Array.from(this.online)
  }
}

class FakePresenceEvents implements PresenceEventsPort {
  published: PresenceUpdatedEvent[] = []

  async publishPresenceUpdated(event: PresenceUpdatedEvent): Promise<void> {
    this.published.push(event)
  }

  async subscribeToPresenceUpdates(callback: (event: PresenceUpdatedEvent) => void): Promise<void> {
    for (const event of this.published) {
      callback(event)
    }
  }
}

class FakeLastSeen implements PresenceLastSeenPort {
  writes: Array<{ userId: string; lastSeenAt: Date }> = []

  async markUserLastSeen(userId: string, lastSeenAt: Date): Promise<void> {
    this.writes.push({ userId, lastSeenAt })
  }
}

function createHarness(now = Date.parse('2026-05-07T12:00:00.000Z')) {
  const repository = new FakePresenceRepository()
  const events = new FakePresenceEvents()
  const lastSeen = new FakeLastSeen()
  const clock: PresenceClockPort = { now: () => now }
  const useCases = new PresenceUseCases(repository, events, clock, lastSeen)

  return { repository, events, lastSeen, useCases }
}

describe('Presence use cases', () => {
  it('sets a user online and publishes an online presence update', async () => {
    const { repository, events, lastSeen, useCases } = createHarness()

    await useCases.setUserOnline('user-1', 'instance-1')

    expect(repository.records.get('user-1')).toEqual({
      status: 'online',
      lastActiveAt: Date.parse('2026-05-07T12:00:00.000Z'),
      instanceId: 'instance-1',
    })
    expect(events.published).toEqual([
      {
        userId: 'user-1',
        status: 'online',
        lastActiveAt: '2026-05-07T12:00:00.000Z',
      },
    ])
    expect(lastSeen.writes).toEqual([
      {
        userId: 'user-1',
        lastSeenAt: new Date('2026-05-07T12:00:00.000Z'),
      },
    ])
  })

  it('returns offline presence for users without a stored online record', async () => {
    const { useCases } = createHarness()

    const presence = await useCases.getUserPresence('user-1')

    expect(presence).toEqual({
      userId: 'user-1',
      status: 'offline',
      lastActiveAt: '2026-05-07T12:00:00.000Z',
    })
  })

  it('cleans inactive users through the repository port and emits offline updates', async () => {
    const { repository, events, lastSeen, useCases } = createHarness()
    await repository.saveOnline('fresh', {
      status: 'online',
      lastActiveAt: Date.parse('2026-05-07T11:59:30.000Z'),
      instanceId: 'instance-1',
    })
    await repository.saveOnline('stale', {
      status: 'online',
      lastActiveAt: Date.parse('2026-05-07T11:00:00.000Z'),
      instanceId: 'instance-2',
    })

    const cleaned = await useCases.cleanupInactiveUsers(5 * 60 * 1000)

    expect(cleaned).toEqual(['stale'])
    expect(repository.online.has('fresh')).toBe(true)
    expect(repository.online.has('stale')).toBe(false)
    expect(events.published).toEqual([
      {
        userId: 'stale',
        status: 'offline',
        lastActiveAt: '2026-05-07T11:00:00.000Z',
      },
    ])
    expect(lastSeen.writes).toEqual([
      {
        userId: 'stale',
        lastSeenAt: new Date('2026-05-07T11:00:00.000Z'),
      },
    ])
  })
})
