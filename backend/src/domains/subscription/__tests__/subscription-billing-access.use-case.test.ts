import { describe, expect, it, mock } from 'bun:test'
import type { SubscriptionBillingAccessRepositoryPort } from '../application/ports'
import { SubscriptionBillingAccessUseCase } from '../application/subscription-billing-access.use-cases'
import { SubscriptionBillingAccountError, type SubscriptionBillingMembership } from '../domain'

function createMembership(
  overrides: Partial<SubscriptionBillingMembership> = {}
): SubscriptionBillingMembership {
  return {
    organizationId: 'org-1',
    role: 'admin',
    ...overrides,
  }
}

function createAccessRepository(input: {
  membership?: SubscriptionBillingMembership | null
  organizationMembership?: SubscriptionBillingMembership | null
}): SubscriptionBillingAccessRepositoryPort {
  return {
    findMembership: mock(async () =>
      input.membership === undefined ? createMembership() : input.membership
    ),
    findMembershipInOrganization: mock(async () =>
      input.organizationMembership === undefined ? createMembership() : input.organizationMembership
    ),
    findUserEmail: mock(async () => null),
    findActiveSubscriptionCustomerId: mock(async () => null),
    findOrganizationSlug: mock(async () => null),
  }
}

describe('Subscription billing access use case', () => {
  it('returns the first admin or owner membership for user-scoped subscription actions', async () => {
    const repository = createAccessRepository({
      membership: createMembership({ organizationId: 'org-2', role: 'owner' }),
    })
    const useCase = new SubscriptionBillingAccessUseCase(repository)

    const result = await useCase.requireBillingManager({ userId: 'user-1' })

    expect(result).toEqual({ organizationId: 'org-2', role: 'owner' })
    expect(repository.findMembership).toHaveBeenCalledWith('user-1')
    expect(repository.findMembershipInOrganization).not.toHaveBeenCalled()
  })

  it('checks membership in a specific organization when one is provided', async () => {
    const repository = createAccessRepository({
      organizationMembership: createMembership({ organizationId: 'org-target' }),
    })
    const useCase = new SubscriptionBillingAccessUseCase(repository)

    const result = await useCase.requireBillingManager({
      userId: 'user-1',
      organizationId: 'org-target',
    })

    expect(result).toEqual({ organizationId: 'org-target', role: 'admin' })
    expect(repository.findMembership).not.toHaveBeenCalled()
    expect(repository.findMembershipInOrganization).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-target',
    })
  })

  it('keeps the existing no-organization error for user-scoped actions', async () => {
    const useCase = new SubscriptionBillingAccessUseCase(
      createAccessRepository({ membership: null })
    )

    await expect(useCase.requireBillingManager({ userId: 'user-1' })).rejects.toMatchObject({
      code: 'NO_ORGANIZATION',
    })
  })

  it('keeps the existing forbidden response shape for organization-scoped actions', async () => {
    const useCase = new SubscriptionBillingAccessUseCase(
      createAccessRepository({ organizationMembership: null })
    )

    await expect(
      useCase.requireBillingManager({ userId: 'user-1', organizationId: 'org-target' })
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_PERMISSIONS',
    })
  })

  it('rejects non-admin members before the route calls billing services', async () => {
    const useCase = new SubscriptionBillingAccessUseCase(
      createAccessRepository({ membership: createMembership({ role: 'member' }) })
    )

    await expect(useCase.requireBillingManager({ userId: 'user-1' })).rejects.toThrow(
      SubscriptionBillingAccountError
    )
  })
})
