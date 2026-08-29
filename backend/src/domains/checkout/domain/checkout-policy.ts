export type InviteEmailValidationError =
  | 'INVALID_FORMAT'
  | 'SELF_INVITE'
  | 'ALREADY_HAS_ORGANIZATION'

export interface InviteEmailValidationInput {
  email: string
  currentUserEmail: string
  invitedUserAlreadyHasOrganization: boolean
}

export interface InviteEmailValidationResult {
  valid: boolean
  error?: InviteEmailValidationError
}

export const PLAN_TRIAL_DAYS: Record<string, number> = {
  starter: 14,
  professional: 14,
  enterprise: 0,
}

export function normalizeCheckoutEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function isValidCheckoutEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateInviteEmailDecision(
  input: InviteEmailValidationInput
): InviteEmailValidationResult {
  const normalizedEmail = normalizeCheckoutEmail(input.email)
  const normalizedCurrentEmail = normalizeCheckoutEmail(input.currentUserEmail)

  if (!isValidCheckoutEmail(normalizedEmail)) {
    return { valid: false, error: 'INVALID_FORMAT' }
  }

  if (normalizedEmail === normalizedCurrentEmail) {
    return { valid: false, error: 'SELF_INVITE' }
  }

  if (input.invitedUserAlreadyHasOrganization) {
    return { valid: false, error: 'ALREADY_HAS_ORGANIZATION' }
  }

  return { valid: true }
}

export function trialDaysForCheckoutSubscription(plan: string): number {
  return PLAN_TRIAL_DAYS[plan] || 0
}

export function trialDaysForFreeTrial(plan: string): number {
  return PLAN_TRIAL_DAYS[plan] || 14
}
