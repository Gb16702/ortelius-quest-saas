export const REQUEST_LIFECYCLE_STATUSES = ['draft', 'open', 'quoted', 'invoiced', 'closed'] as const

export const REQUEST_CLOSED_REASONS = [
  'request_rejected',
  'quote_rejected',
  'cancelled',
  'expired',
] as const

export type RequestLifecycleStatus = (typeof REQUEST_LIFECYCLE_STATUSES)[number]
export type RequestClosedReason = (typeof REQUEST_CLOSED_REASONS)[number]

export function isRequestLifecycleStatus(status: string): status is RequestLifecycleStatus {
  return REQUEST_LIFECYCLE_STATUSES.includes(status as RequestLifecycleStatus)
}

export function isRequestClosedReason(reason: string): reason is RequestClosedReason {
  return REQUEST_CLOSED_REASONS.includes(reason as RequestClosedReason)
}

export function normalizeRequestLifecycleStatus(status: string): RequestLifecycleStatus {
  if (!isRequestLifecycleStatus(status)) {
    throw new Error(`Unknown request lifecycle status: ${status}`)
  }
  return status
}

export function normalizeRequestClosedReason(
  reason: string | null | undefined
): RequestClosedReason | null {
  if (reason == null) return null
  if (!isRequestClosedReason(reason)) {
    throw new Error(`Unknown request closed reason: ${reason}`)
  }
  return reason
}

export function canValidateDraft(status: RequestLifecycleStatus): boolean {
  return status === 'draft'
}

export function canDeleteDraft(status: RequestLifecycleStatus): boolean {
  return status === 'draft'
}
