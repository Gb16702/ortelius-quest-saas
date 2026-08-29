import { describe, expect, it, mock } from 'bun:test'
import { GetOrganizationSetupStatusUseCase } from '../application/organization-setup.use-case'
import type {
  OrganizationMembershipQueryPort,
  OrganizationSetupQueryPort,
} from '../application/ports'

function createMemberships(found = true): OrganizationMembershipQueryPort {
  return {
    findMembership: mock(async () =>
      found
        ? {
            id: 'member-1',
            role: 'member',
            organizationId: 'org-1',
            userId: 'user-1',
          }
        : null
    ),
  }
}

function createSetupQuery(): OrganizationSetupQueryPort {
  return {
    getSetupSnapshot: mock(async () => ({
      logo: 'https://cdn.example.com/logo.png',
      tagline: 'Moving cargo',
      overview: 'Overview',
      taxIdType: 'vat',
      taxIdNumber: 'BE123',
      servicesCount: 2,
      cargoTypesCount: 1,
      legalDocumentsCount: 1,
      memberCount: 4,
    })),
  }
}

describe('Organization setup use case', () => {
  it('checks membership before deriving setup status', async () => {
    const memberships = createMemberships()
    const setup = createSetupQuery()
    const useCase = new GetOrganizationSetupStatusUseCase(memberships, setup)

    const result = await useCase.execute({ organizationId: 'org-1', actorId: 'user-1' })

    expect(memberships.findMembership).toHaveBeenCalledWith('user-1', 'org-1')
    expect(setup.getSetupSnapshot).toHaveBeenCalledWith('org-1')
    expect(result).toEqual(
      expect.objectContaining({
        hasLogo: true,
        hasServices: true,
        hasCargoTypes: true,
        hasVatConfig: true,
        hasLegalDocuments: true,
        memberCount: 4,
        isComplete: true,
      })
    )
  })

  it('rejects non-members before loading setup data', async () => {
    const memberships = createMemberships(false)
    const setup = createSetupQuery()
    const useCase = new GetOrganizationSetupStatusUseCase(memberships, setup)

    await expect(useCase.execute({ organizationId: 'org-1', actorId: 'user-1' })).rejects.toThrow(
      'User is not a member of this organization'
    )
    expect(setup.getSetupSnapshot).not.toHaveBeenCalled()
  })
})
