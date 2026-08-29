export enum ERequestPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export type RequestPriority = ERequestPriority | null

export const PRIORITY_THRESHOLDS = {
  HIGH: 5,
  MEDIUM: 14,
} as const

export function calculateRequestPriority(
  fromDate: Date,
  lifecycleStatus?: string
): RequestPriority {
  if (lifecycleStatus === 'invoiced' || lifecycleStatus === 'closed') return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const fromDateNormalized = new Date(fromDate)
  fromDateNormalized.setHours(0, 0, 0, 0)

  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntil = Math.floor((fromDateNormalized.getTime() - now.getTime()) / msPerDay)

  if (daysUntil < 0) return null

  if (daysUntil <= PRIORITY_THRESHOLDS.HIGH) return ERequestPriority.HIGH
  if (daysUntil <= PRIORITY_THRESHOLDS.MEDIUM) return ERequestPriority.MEDIUM
  return ERequestPriority.LOW
}
