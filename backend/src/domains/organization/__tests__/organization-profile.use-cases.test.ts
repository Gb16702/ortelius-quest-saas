import { describe, expect, it, mock } from 'bun:test'
import {
  GetOrganizationBySlugUseCase,
  GetOrganizationInfoUseCase,
} from '../application/organization-profile.use-cases'
import type { OrganizationProfileQueryPort } from '../application/ports'
import { DEFAULT_ORGANIZATION_FONT } from '../domain'

function createProfileQuery(overrides: Partial<OrganizationProfileQueryPort> = {}) {
  return {
    findBySlug: mock(async () => ({
      id: 'org-1',
      name: 'Ortelius',
      slug: 'ortelius',
      logo: null,
      brandLogo: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      brandColor: '#0103B8',
      font: DEFAULT_ORGANIZATION_FONT,
    })),
    findInfo: mock(async () => ({
      id: 'org-1',
      name: 'Ortelius',
      slug: 'ortelius',
      logo: null,
      brandLogo: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      taxIdType: 'vat',
      taxIdNumber: 'BE123',
      emailIntakeEnabled: true,
      brandColor: '#0103B8',
      font: DEFAULT_ORGANIZATION_FONT,
    })),
    ...overrides,
  }
}

describe('Organization profile use cases', () => {
  it('loads an organization by slug through the query port', async () => {
    const query = createProfileQuery()
    const useCase = new GetOrganizationBySlugUseCase(query)

    const result = await useCase.execute({ slug: 'ortelius' })

    expect(query.findBySlug).toHaveBeenCalledWith('ortelius')
    expect(result).toEqual(expect.objectContaining({ id: 'org-1', slug: 'ortelius' }))
  })

  it('loads organization info through the query port', async () => {
    const query = createProfileQuery()
    const useCase = new GetOrganizationInfoUseCase(query)

    const result = await useCase.execute({ organizationId: 'org-1' })

    expect(query.findInfo).toHaveBeenCalledWith('org-1')
    expect(result).toEqual(
      expect.objectContaining({
        id: 'org-1',
        taxIdType: 'vat',
        emailIntakeEnabled: true,
      })
    )
  })
})
