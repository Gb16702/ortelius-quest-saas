import { describe, expect, it, mock } from 'bun:test'
import {
  AssistantAccessPolicy,
  type AssistantAccessPolicyConfig,
} from '../application/assistant-access-policy'
import type { AssistantOrganizationContext, AssistantRepositoryPort } from '../application/ports'

const eligibleConfig: AssistantAccessPolicyConfig = {
  enabled: true,
  allowedPlans: ['professional', 'enterprise'],
  allowedStatuses: ['active', 'trialing'],
}

const organizationContext: AssistantOrganizationContext = {
  organization: {
    id: 'org-123',
    name: 'Acme',
    slug: 'acme',
    status: 'active',
    tagline: null,
  },
  membership: {
    role: 'admin',
  },
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
}

function createRepository(
  context: AssistantOrganizationContext | null
): Pick<AssistantRepositoryPort, 'getOrganizationContextForUser'> {
  return {
    getOrganizationContextForUser: mock(() => Promise.resolve(context)),
  }
}

describe('Assistant access policy', () => {
  it('allows Professional trial subscriptions', async () => {
    const policy = new AssistantAccessPolicy(
      createRepository(organizationContext) as AssistantRepositoryPort,
      eligibleConfig
    )

    await expect(
      policy.checkAccess({ userId: 'user-123', organizationId: 'org-123' })
    ).resolves.toEqual({ allowed: true })
  })

  it('denies access when the feature flag is disabled', async () => {
    const policy = new AssistantAccessPolicy(
      createRepository(organizationContext) as AssistantRepositoryPort,
      { ...eligibleConfig, enabled: false }
    )

    await expect(
      policy.checkAccess({ userId: 'user-123', organizationId: 'org-123' })
    ).resolves.toEqual({
      allowed: false,
      reason: 'FEATURE_DISABLED',
      message: 'Quest Assistant is not enabled for this environment.',
      status: 403,
    })
  })

  it('requires an organization context', async () => {
    const policy = new AssistantAccessPolicy(
      createRepository(organizationContext) as AssistantRepositoryPort,
      eligibleConfig
    )

    await expect(policy.checkAccess({ userId: 'user-123' })).resolves.toEqual({
      allowed: false,
      reason: 'ORGANIZATION_REQUIRED',
      message: 'Quest Assistant requires an active organization subscription.',
      status: 402,
    })
  })

  it('denies Starter subscriptions', async () => {
    const policy = new AssistantAccessPolicy(
      createRepository({
        ...organizationContext,
        subscription: {
          ...organizationContext.subscription!,
          plan: 'starter',
        },
      }) as AssistantRepositoryPort,
      eligibleConfig
    )

    await expect(
      policy.checkAccess({ userId: 'user-123', organizationId: 'org-123' })
    ).resolves.toEqual({
      allowed: false,
      reason: 'PLAN_NOT_ALLOWED',
      message: 'Quest Assistant is available on Professional and Enterprise plans.',
      status: 402,
      details: {
        plan: 'starter',
        requiredPlans: ['professional', 'enterprise'],
      },
    })
  })

  it('requires active or trialing subscriptions', async () => {
    const policy = new AssistantAccessPolicy(
      createRepository({
        ...organizationContext,
        subscription: {
          ...organizationContext.subscription!,
          status: 'past_due',
        },
      }) as AssistantRepositoryPort,
      eligibleConfig
    )

    await expect(
      policy.checkAccess({ userId: 'user-123', organizationId: 'org-123' })
    ).resolves.toEqual({
      allowed: false,
      reason: 'SUBSCRIPTION_NOT_ACTIVE',
      message: 'Quest Assistant requires an active subscription or active trial.',
      status: 402,
      details: {
        status: 'past_due',
        allowedStatuses: ['active', 'trialing'],
      },
    })
  })
})
