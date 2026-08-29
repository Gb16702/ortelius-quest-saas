import type { PresenceData, PresenceUpdatedEvent, UserPresence } from '../domain/presence.types'

export interface PresenceRepositoryPort {
  saveOnline(userId: string, data: PresenceData): Promise<void>
  removeOnline(userId: string): Promise<void>
  updateActivity(userId: string, lastActiveAt: number): Promise<void>
  getPresenceData(userId: string): Promise<PresenceData | null>
  getBatchPresenceData(userIds: string[]): Promise<Map<string, PresenceData | null>>
  getOnlineUserIds(): Promise<string[]>
}

export interface PresenceEventsPort {
  publishPresenceUpdated(event: PresenceUpdatedEvent): Promise<void>
  subscribeToPresenceUpdates(callback: (event: PresenceUpdatedEvent) => void): Promise<void>
}

export interface PresenceClockPort {
  now(): number
}

export interface PresenceLastSeenPort {
  markUserLastSeen(userId: string, lastSeenAt: Date): Promise<void>
}

export interface PresenceReaderPort {
  getUserPresence(userId: string): Promise<UserPresence | null>
  getBatchPresence(userIds: string[]): Promise<Map<string, UserPresence>>
  getOnlineUserIds(): Promise<string[]>
}
