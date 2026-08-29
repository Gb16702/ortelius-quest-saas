export type PresenceStatus = 'online' | 'offline'

export const DEFAULT_PRESENCE_TIMEOUT_MS = 5 * 60 * 1000

export interface UserPresence {
  userId: string
  status: PresenceStatus
  lastActiveAt: string
}

export interface PresenceData {
  status: PresenceStatus
  lastActiveAt: number
  instanceId: string
}

export interface PresenceUpdateEvent {
  type: 'connect' | 'disconnect' | 'activity'
  userId: string
  instanceId: string
  timestamp: number
}

export interface PresenceUpdatedEvent {
  userId: string
  status: PresenceStatus
  lastActiveAt: string
}

export function createOnlinePresence(instanceId: string, now: number): PresenceData {
  return {
    status: 'online',
    lastActiveAt: now,
    instanceId,
  }
}

export function toUserPresence(
  userId: string,
  data: PresenceData | null | undefined,
  now: number
): UserPresence {
  if (!data) {
    return {
      userId,
      status: 'offline',
      lastActiveAt: new Date(now).toISOString(),
    }
  }

  return {
    userId,
    status: data.status,
    lastActiveAt: new Date(data.lastActiveAt).toISOString(),
  }
}

export function getOfflineLastActiveAt(data: PresenceData | null | undefined, now: number): string {
  return new Date(data?.lastActiveAt ?? now).toISOString()
}

export function isPresenceInactive(
  data: PresenceData | null | undefined,
  now: number,
  timeoutMs: number
): boolean {
  if (!data) return true
  return now - data.lastActiveAt > timeoutMs
}
