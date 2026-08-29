import { describe, expect, it, mock } from 'bun:test'
import {
  RemoveOrganizationLogoUseCase,
  UpdateOrganizationLogoUseCase,
} from '../application/organization-logo.use-cases'
import { GetOrganizationShowcaseUseCase } from '../application/organization-showcase.use-case'
import type {
  OrganizationLogoActivityPort,
  OrganizationLogoRepositoryPort,
  OrganizationLogoStoragePort,
  OrganizationMembershipQueryPort,
  OrganizationShowcaseQueryPort,
} from '../application/ports'
import { DEFAULT_ORGANIZATION_FONT } from '../domain'

function createMemberships(role: string | null): OrganizationMembershipQueryPort {
  return {
    findMembership: mock(async () =>
      role
        ? {
            id: 'member-1',
            role,
            organizationId: 'org-1',
            userId: 'user-1',
          }
        : null
    ),
  }
}

function createLogos(logo: string | null = 'https://cdn.example.com/logo.png') {
  return {
    findLogo: mock(async () => ({ logo })),
    setLogo: mock(async () => undefined),
    clearLogo: mock(async () => undefined),
  } satisfies OrganizationLogoRepositoryPort
}

function createStorage(): OrganizationLogoStoragePort {
  return {
    uploadLogo: mock(async () => ({
      logoUrl: 'https://cdn.example.com/new-logo.png',
      thumbnailUrl: 'https://cdn.example.com/thumb.png',
    })),
    deleteLogoFiles: mock(async () => undefined),
  }
}

function createLogoActivity(): OrganizationLogoActivityPort {
  return {
    logLogoUpdated: mock(async () => undefined),
    logLogoRemoved: mock(async () => undefined),
  }
}

describe('Organization logo and showcase use cases', () => {
  it('updates a logo after checking admin membership', async () => {
    const memberships = createMemberships('admin')
    const logos = createLogos()
    const storage = createStorage()
    const activity = createLogoActivity()
    const useCase = new UpdateOrganizationLogoUseCase(memberships, logos, storage, activity)

    const result = await useCase.execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      buffer: Buffer.from('image'),
      filename: 'logo.png',
      contentType: 'image/png',
    })

    expect(result.logoUrl).toBe('https://cdn.example.com/new-logo.png')
    expect(memberships.findMembership).toHaveBeenCalledWith('user-1', 'org-1')
    expect(storage.uploadLogo).toHaveBeenCalled()
    expect(logos.setLogo).toHaveBeenCalledWith('org-1', 'https://cdn.example.com/new-logo.png')
    expect(storage.deleteLogoFiles).toHaveBeenCalledWith('https://cdn.example.com/logo.png')
    expect(activity.logLogoUpdated).toHaveBeenCalledWith('org-1', 'user-1')
  })

  it('rejects logo updates for regular members before uploading', async () => {
    const storage = createStorage()
    const useCase = new UpdateOrganizationLogoUseCase(
      createMemberships('member'),
      createLogos(),
      storage,
      createLogoActivity()
    )

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        actorId: 'user-1',
        buffer: Buffer.from('image'),
        filename: 'logo.png',
        contentType: 'image/png',
      })
    ).rejects.toThrow('Insufficient permissions. Admin or Owner role required')
    expect(storage.uploadLogo).not.toHaveBeenCalled()
  })

  it('removes an existing logo and deletes stored files', async () => {
    const logos = createLogos()
    const storage = createStorage()
    const activity = createLogoActivity()
    const useCase = new RemoveOrganizationLogoUseCase(
      createMemberships('owner'),
      logos,
      storage,
      activity
    )

    await useCase.execute({ organizationId: 'org-1', actorId: 'user-1' })

    expect(logos.clearLogo).toHaveBeenCalledWith('org-1')
    expect(storage.deleteLogoFiles).toHaveBeenCalledWith('https://cdn.example.com/logo.png')
    expect(activity.logLogoRemoved).toHaveBeenCalledWith('org-1', 'user-1')
  })

  it('throws the legacy no-logo message when removing without a logo', async () => {
    const useCase = new RemoveOrganizationLogoUseCase(
      createMemberships('admin'),
      createLogos(null),
      createStorage(),
      createLogoActivity()
    )

    await expect(useCase.execute({ organizationId: 'org-1', actorId: 'user-1' })).rejects.toThrow(
      'No logo to remove'
    )
  })

  it('loads showcase data through the query port', async () => {
    const showcase: OrganizationShowcaseQueryPort = {
      findBySlug: mock(async () => ({
        organization: {
          id: 'org-1',
          name: 'Ortelius',
          slug: 'ortelius',
          logo: null,
          tagline: null,
          overview: null,
          website: null,
          brandColor: '#0103B8',
          font: DEFAULT_ORGANIZATION_FONT,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          memberCount: 2,
        },
        stats: { profileViews: 3, requestsHandled: 4, responseRate: 50 },
        services: [],
        cargoTypes: [],
      })),
    }
    const useCase = new GetOrganizationShowcaseUseCase(showcase)

    const result = await useCase.execute({ slug: 'ortelius', days: 30 })

    expect(result.organization.id).toBe('org-1')
    expect(showcase.findBySlug).toHaveBeenCalledWith('ortelius', 30)
  })
})
