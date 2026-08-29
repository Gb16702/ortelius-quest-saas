import { createPresenceUseCases, PresenceUseCases } from '../application/presence-use-cases'
import { DrizzleMemberLastSeenRepository } from './member-last-seen.repository'
import { redisPresenceEvents, redisPresenceRepository } from './redis-presence.repository'

export class PresenceService extends PresenceUseCases {
  private cleanupInterval: NodeJS.Timeout | null = null

  startCleanupJob(intervalMs = 60000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveUsers().catch((err) => {
        console.error('Error cleaning up inactive users:', err)
      })
    }, intervalMs)

    console.log(`Presence cleanup job started (interval: ${intervalMs}ms)`)
  }

  stopCleanupJob(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('Presence cleanup job stopped')
    }
  }
}

const memberLastSeenRepository = new DrizzleMemberLastSeenRepository()

export const presenceService = new PresenceService(
  redisPresenceRepository,
  redisPresenceEvents,
  undefined,
  memberLastSeenRepository
)

export const presenceUseCases = createPresenceUseCases({
  repository: redisPresenceRepository,
  events: redisPresenceEvents,
  lastSeen: memberLastSeenRepository,
})
