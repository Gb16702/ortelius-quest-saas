import { describe, expect, it } from 'bun:test'
import {
  normalizeCheckoutEmail,
  trialDaysForCheckoutSubscription,
  trialDaysForFreeTrial,
  validateInviteEmailDecision,
} from '../domain'

describe('Checkout domain policy', () => {
  it('normalizes invite email addresses before validation decisions', () => {
    expect(normalizeCheckoutEmail(' ADA@Example.COM ')).toBe('ada@example.com')
  })

  it('rejects invalid, self, and already-member invite emails', () => {
    expect(
      validateInviteEmailDecision({
        email: 'invalid',
        currentUserEmail: 'owner@example.com',
        invitedUserAlreadyHasOrganization: false,
      })
    ).toEqual({ valid: false, error: 'INVALID_FORMAT' })

    expect(
      validateInviteEmailDecision({
        email: 'owner@example.com',
        currentUserEmail: ' OWNER@example.com ',
        invitedUserAlreadyHasOrganization: false,
      })
    ).toEqual({ valid: false, error: 'SELF_INVITE' })

    expect(
      validateInviteEmailDecision({
        email: 'member@example.com',
        currentUserEmail: 'owner@example.com',
        invitedUserAlreadyHasOrganization: true,
      })
    ).toEqual({ valid: false, error: 'ALREADY_HAS_ORGANIZATION' })
  })

  it('preserves checkout and cardless trial fallback trial-day behavior', () => {
    expect(trialDaysForCheckoutSubscription('unknown')).toBe(0)
    expect(trialDaysForFreeTrial('unknown')).toBe(14)
    expect(trialDaysForFreeTrial('enterprise')).toBe(14)
  })
})
