export const ACTIVITY_SCORE_TARGET_POINTS_PER_DAY = 4

export const ACTIVITY_SCORE_EVENT_WEIGHTS: Record<string, number> = {
  'request-created': 4,
  'request-updated': 3,
  'request-validated': 8,
  'request-assigned': 4,
  'request-reassigned': 4,
  'request-shared-to-team-chat': 2,
  'quote-created': 12,
  'quote-updated': 4,
  'quote-accepted': 8,
  'quote-rejected': 2,
  'invoice-created': 14,
  'invoice-sent': 6,
}

export function getActivityScoreEventWeight(eventType: string): number {
  return ACTIVITY_SCORE_EVENT_WEIGHTS[eventType] ?? 1
}

export function calculateActivityScore(totalPoints: number, periodDays: number): number {
  const targetPoints = getActivityScoreTargetPoints(periodDays)
  if (targetPoints <= 0) return 0

  return Math.min(100, Math.round((totalPoints / targetPoints) * 100))
}

export function getActivityScoreTargetPoints(periodDays: number): number {
  return periodDays * ACTIVITY_SCORE_TARGET_POINTS_PER_DAY
}
