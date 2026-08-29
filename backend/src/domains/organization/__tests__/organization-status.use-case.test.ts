import { describe, expect, it, mock } from 'bun:test'
import { OrganizationNotFoundError } from '../application/organization-errors'
import { GetOrganizationStatusUseCase } from '../application/organization-status.use-case'
import type { OrganizationStatusQueryPort } from '../application/ports'

function createStatusQuery(overrides: Partial<OrganizationStatusQueryPort> = {}) {
  return {
    findOrganizationStatus: mock(async () => ({
      id: 'org-1',
      name: 'Ortelius',
      status: 'pending',
      slug: 'ortelius',
    })),
    findActiveSubscription: mock(async () => null),
    ...overrides,
  }
}

describe('Organization status use case', () => {
  it('returns organization status with derived flags', async () => {
    const query = createStatusQuery({
      findActiveSubscription: mock(async () => ({ plan: 'pro', status: 'trialing' })),
    })
    const useCase = new GetOrganizationStatusUseCase(query)

    const result = await useCase.execute({ organizationId: 'org-1' })

    expect(query.findOrganizationStatus).toHaveBeenCalledWith('org-1')
    expect(query.findActiveSubscription).toHaveBeenCalledWith('org-1')
    expect(result).toEqual({
      organization: {
        id: 'org-1',
        name: 'Ortelius',
        status: 'pending',
        slug: 'ortelius',
      },
      subscription: { plan: 'pro', status: 'trialing' },
      isActive: false,
      isPending: true,
      isSuspended: false,
      requiresSubscription: false,
    })
  })

  it('throws a typed error when the organization does not exist', async () => {
    const query = createStatusQuery({
      findOrganizationStatus: mock(async () => null),
    })
    const useCase = new GetOrganizationStatusUseCase(query)

    await expect(useCase.execute({ organizationId: 'missing' })).rejects.toThrow(
      OrganizationNotFoundError
    )
    expect(query.findActiveSubscription).not.toHaveBeenCalled()
  })
})
