import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  CompleteCheckoutUseCase,
  CreateSubscriptionUseCase,
  StartFreeTrialUseCase,
  ValidateInviteEmailUseCase,
} from '../application/checkout-use-cases'
import type { CheckoutUseCaseDependencies } from '../application/ports'

function createDeps(): CheckoutUseCaseDependencies {
  return {
    plans: {
      getPlanPrice: mock((plan: string) =>
        plan === 'starter' ? { monthly: 'price_starter_monthly' } : undefined
      ),
    },
    billing: {
      createSubscription: mock(async () => ({
        clientSecret: 'secret',
        subscriptionId: 'sub_1',
        customerId: 'cus_1',
        type: 'setup' as const,
      })),
      retrieveSubscription: mock(async () => ({
        subscriptionId: 'sub_1',
        status: 'active',
        customerId: 'cus_1',
      })),
      createCardlessTrialSubscription: mock(async () => ({
        id: 'sub_trial',
        status: 'trialing',
        metadata: { plan: 'starter', billingModel: 'per-seat' },
        currentPeriodStart: 1_700_000_000,
        currentPeriodEnd: 1_701_209_600,
        trialStart: 1_700_000_000,
        trialEnd: 1_701_209_600,
        customerId: 'cus_trial',
        firstItemQuantity: 1,
      })),
      retrieveCheckoutSubscription: mock(async () => {
        throw new Error('not used')
      }),
      updateCustomerMetadata: mock(async () => {}),
      updateSubscriptionMetadata: mock(async () => {}),
    },
    persistence: {
      findUserIdByEmail: mock(async (email: string) =>
        email === 'member@example.com' ? 'user-existing' : null
      ),
      userHasOrganizationMembership: mock(async (userId: string) => userId === 'user-existing'),
      findOrganizationById: mock(async (organizationId: string) =>
        organizationId === 'org_existing'
          ? { organizationId: 'org_existing', slug: 'existing-org' }
          : null
      ),
      userOwnsOrganization: mock(async (userId: string, organizationId: string) => {
        return userId === 'user_1' && organizationId === 'org_existing'
      }),
      updateUserStripeCustomerId: mock(async () => {}),
      createOrganization: mock(async () => {}),
      createOwnerMembership: mock(async () => {}),
      createSubscriptionRecord: mock(async () => {}),
    },
    slugs: {
      generateSlug: mock(() => 'acme'),
      validateSlug: mock((slug: string) =>
        slug === 'admin'
          ? {
              valid: false,
              error: 'This slug is reserved and cannot be used',
              errorCode: 'SUBDOMAIN_RESERVED',
            }
          : { valid: true }
      ),
      isSlugAvailable: mock(async (slug: string) => slug === 'acme-1'),
    },
    conversations: {
      createTeamConversation: mock(async () => {}),
    },
    ids: {
      randomId: mock(() => 'id_1'),
    },
    clock: {
      now: mock(() => new Date('2026-01-01T00:00:00.000Z')),
    },
  }
}

describe('Checkout use cases', () => {
  let deps: CheckoutUseCaseDependencies

  beforeEach(() => {
    deps = createDeps()
  })

  it('validates invite emails through repository ports', async () => {
    const result = await new ValidateInviteEmailUseCase(deps).execute({
      email: ' Member@Example.com ',
      currentUserEmail: 'owner@example.com',
    })

    expect(result).toEqual({ valid: false, error: 'ALREADY_HAS_ORGANIZATION' })
    expect(deps.persistence.findUserIdByEmail).toHaveBeenCalledWith('member@example.com')
    expect(deps.persistence.userHasOrganizationMembership).toHaveBeenCalledWith('user-existing')
  })

  it('creates paid subscriptions with an explicit available slug in Stripe metadata', async () => {
    deps.slugs.isSlugAvailable = mock(async (slug: string) => slug === 'quest-logistics')

    await new CreateSubscriptionUseCase(deps).execute({
      email: 'owner@example.com',
      fullName: 'Owner',
      organizationName: 'Acme',
      organizationSlug: 'quest-logistics',
      plan: 'starter',
    })

    expect(deps.billing.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationName: 'Acme',
        organizationSlug: 'quest-logistics',
      })
    )
  })

  it('rejects paid subscription creation when the explicit slug is unavailable', async () => {
    await expect(
      new CreateSubscriptionUseCase(deps).execute({
        email: 'owner@example.com',
        fullName: 'Owner',
        organizationName: 'Acme',
        organizationSlug: 'acme',
        plan: 'starter',
      })
    ).rejects.toMatchObject({ errorCode: 'SUBDOMAIN_TAKEN', status: 409 })

    expect(deps.billing.createSubscription).not.toHaveBeenCalled()
  })

  it('starts a cardless trial and persists organization, owner, and subscription records', async () => {
    const result = await new StartFreeTrialUseCase(deps).execute({
      organizationName: 'Acme',
      plan: 'starter',
      userId: 'user_1',
      email: 'owner@example.com',
      fullName: 'Owner',
    })

    expect(result).toEqual({ organizationId: 'id_1', slug: 'acme-1', checkoutId: 'sub_trial' })
    expect(deps.billing.createCardlessTrialSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        priceId: 'price_starter_monthly',
        trialDays: 14,
      })
    )
    expect(deps.persistence.createSubscriptionRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSubscriptionId: 'sub_trial',
        stripeCustomerId: 'cus_trial',
        periodStart: new Date(1_700_000_000 * 1000),
        trialEnd: new Date(1_701_209_600 * 1000),
      })
    )
    expect(deps.billing.updateSubscriptionMetadata).toHaveBeenCalledWith(
      'sub_trial',
      expect.objectContaining({ organizationId: 'id_1' })
    )
  })

  it('uses an explicit organization slug for cardless trials when available', async () => {
    deps.slugs.isSlugAvailable = mock(async (slug: string) => slug === 'quest-logistics')

    const result = await new StartFreeTrialUseCase(deps).execute({
      organizationName: 'Acme',
      organizationSlug: 'quest-logistics',
      plan: 'starter',
      userId: 'user_1',
      email: 'owner@example.com',
      fullName: 'Owner',
    })

    expect(result).toEqual({
      organizationId: 'id_1',
      slug: 'quest-logistics',
      checkoutId: 'sub_trial',
    })
    expect(deps.persistence.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme',
        slug: 'quest-logistics',
      })
    )
    expect(deps.billing.updateCustomerMetadata).toHaveBeenCalledWith(
      'cus_trial',
      expect.objectContaining({ organizationSlug: 'quest-logistics' })
    )
  })

  it('rejects explicit cardless trial slugs when unavailable', async () => {
    await expect(
      new StartFreeTrialUseCase(deps).execute({
        organizationName: 'Acme',
        organizationSlug: 'acme',
        plan: 'starter',
        userId: 'user_1',
        email: 'owner@example.com',
        fullName: 'Owner',
      })
    ).rejects.toMatchObject({ errorCode: 'SUBDOMAIN_TAKEN', status: 409 })

    expect(deps.persistence.createOrganization).not.toHaveBeenCalled()
  })

  it('completes checkout by deriving organization name from subscription metadata', async () => {
    deps.billing.retrieveCheckoutSubscription = mock(async () => ({
      id: 'sub_checkout',
      status: 'active',
      metadata: {
        organizationName: 'Acme From Stripe',
        organizationSlug: 'acme-1',
        plan: 'professional',
        billingModel: 'per-seat',
      },
      currentPeriodStart: 1_700_000_000,
      currentPeriodEnd: 1_702_592_000,
      trialStart: null,
      trialEnd: null,
      customerId: 'cus_checkout',
      firstItemQuantity: 3,
    }))

    const result = await new CompleteCheckoutUseCase(deps).execute({
      checkoutId: 'sub_checkout',
      userId: 'user_1',
    })

    expect(result).toEqual({ organizationId: 'id_1', slug: 'acme-1' })
    expect(deps.billing.retrieveCheckoutSubscription).toHaveBeenCalledWith('sub_checkout')
    expect(deps.persistence.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme From Stripe',
        stripeCustomerId: 'cus_checkout',
      })
    )
    expect(deps.persistence.createSubscriptionRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'professional',
        stripeSubscriptionId: 'sub_checkout',
        seats: '3',
      })
    )
    expect(deps.billing.updateSubscriptionMetadata).toHaveBeenCalledWith(
      'sub_checkout',
      expect.objectContaining({
        organizationName: 'Acme From Stripe',
        organizationId: 'id_1',
        userId: 'user_1',
      })
    )
  })

  it('returns an existing organization for repeated completion with metadata organizationId', async () => {
    deps.billing.retrieveCheckoutSubscription = mock(async () => ({
      id: 'sub_checkout',
      status: 'active',
      metadata: {
        organizationId: 'org_existing',
        organizationName: 'Existing Org',
        plan: 'starter',
      },
      currentPeriodStart: 1_700_000_000,
      currentPeriodEnd: 1_702_592_000,
      trialStart: null,
      trialEnd: null,
      customerId: 'cus_checkout',
      firstItemQuantity: 1,
    }))

    const result = await new CompleteCheckoutUseCase(deps).execute({
      checkoutId: 'sub_checkout',
      userId: 'user_1',
    })

    expect(result).toEqual({ organizationId: 'org_existing', slug: 'existing-org' })
    expect(deps.persistence.findOrganizationById).toHaveBeenCalledWith('org_existing')
    expect(deps.persistence.userOwnsOrganization).toHaveBeenCalledWith('user_1', 'org_existing')
    expect(deps.persistence.createOrganization).not.toHaveBeenCalled()
    expect(deps.persistence.createOwnerMembership).not.toHaveBeenCalled()
    expect(deps.persistence.createSubscriptionRecord).not.toHaveBeenCalled()
  })
})
