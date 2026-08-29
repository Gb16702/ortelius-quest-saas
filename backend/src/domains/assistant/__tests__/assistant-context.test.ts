import { describe, expect, it } from 'bun:test'
import {
  buildCurrentUserContext,
  buildOrganizationSummaryContext,
  buildSubscriptionTrialContext,
  serializeOrganizationContext,
} from '../application/assistant-context'

describe('Assistant context helpers', () => {
  it('builds a safe current user context', () => {
    expect(
      buildCurrentUserContext({
        id: 'user-123',
        email: 'user@example.com',
        name: 'User Name',
        image: null,
        role: 'member',
      })
    ).toEqual({
      user: {
        id: 'user-123',
        email: 'user@example.com',
        name: 'User Name',
        role: 'member',
      },
    })
  })

  it('serializes organization dates for tool output', () => {
    expect(
      serializeOrganizationContext({
        organization: {
          id: 'org-123',
          name: 'Acme',
          slug: 'acme',
          status: 'active',
          tagline: 'Fast cargo',
        },
        membership: { role: 'admin' },
        subscription: {
          plan: 'professional',
          status: 'trialing',
          periodEnd: new Date('2026-07-01T00:00:00.000Z'),
          trialEnd: new Date('2026-06-20T00:00:00.000Z'),
          cancelAtPeriodEnd: false,
        },
        usage: {
          memberCount: 3,
          pendingInvitationCount: 1,
        },
      })
    ).toEqual({
      organization: {
        id: 'org-123',
        name: 'Acme',
        slug: 'acme',
        status: 'active',
        tagline: 'Fast cargo',
      },
      membership: { role: 'admin' },
      subscription: {
        plan: 'professional',
        status: 'trialing',
        periodEnd: '2026-07-01T00:00:00.000Z',
        trialEnd: '2026-06-20T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      },
      usage: {
        memberCount: 3,
        pendingInvitationCount: 1,
      },
    })
  })

  it('builds subscription trial context with remaining days', () => {
    expect(
      buildSubscriptionTrialContext(
        {
          organization: {
            id: 'org-123',
            name: 'Acme',
            slug: 'acme',
            status: 'active',
            tagline: null,
          },
          membership: { role: 'owner' },
          subscription: {
            plan: 'professional',
            status: 'trialing',
            periodEnd: new Date('2026-07-01T00:00:00.000Z'),
            trialEnd: new Date('2026-06-20T00:00:00.000Z'),
            cancelAtPeriodEnd: false,
          },
          usage: {
            memberCount: 2,
            pendingInvitationCount: 0,
          },
        },
        new Date('2026-06-11T00:00:00.000Z')
      )
    ).toEqual({
      hasSubscription: true,
      plan: 'professional',
      status: 'trialing',
      periodEnd: '2026-07-01T00:00:00.000Z',
      trialEnd: '2026-06-20T00:00:00.000Z',
      trialDaysRemaining: 9,
      cancelAtPeriodEnd: false,
    })
  })

  it('builds organization summary context', () => {
    expect(
      buildOrganizationSummaryContext({
        organization: {
          id: 'org-123',
          name: 'Acme',
          slug: 'acme',
          status: 'active',
          tagline: 'Fast cargo',
        },
        membership: { role: 'admin' },
        subscription: {
          plan: 'enterprise',
          status: 'active',
          periodEnd: null,
          trialEnd: null,
          cancelAtPeriodEnd: false,
        },
        usage: {
          memberCount: 7,
          pendingInvitationCount: 2,
        },
      })
    ).toEqual({
      organization: {
        id: 'org-123',
        name: 'Acme',
        slug: 'acme',
        status: 'active',
        tagline: 'Fast cargo',
      },
      membership: { role: 'admin' },
      usage: {
        memberCount: 7,
        pendingInvitationCount: 2,
      },
      currentPlan: 'enterprise',
      currentSubscriptionStatus: 'active',
    })
  })
})
