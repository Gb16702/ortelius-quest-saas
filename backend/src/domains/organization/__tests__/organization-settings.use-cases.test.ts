import { describe, expect, it, mock } from 'bun:test'
import { OrganizationPermissionError } from '../application/organization-errors'
import {
  OrganizationSlugError,
  UpdateOrganizationSettingsUseCase,
  UpdateOrganizationTaxIdUseCase,
} from '../application/organization-settings.use-cases'
import type {
  OrganizationMembershipQueryPort,
  OrganizationSettingsRepositoryPort,
  OrganizationSlugPort,
} from '../application/ports'

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

function createSettingsRepository(): OrganizationSettingsRepositoryPort {
  return {
    findSlug: mock(async () => 'ortelius'),
    updateSettings: mock(async () => undefined),
    updateTaxId: mock(async () => undefined),
  }
}

function createSlugs(input: { available?: boolean } = {}): OrganizationSlugPort {
  return {
    validateSlug: mock((slug: string) =>
      slug === 'admin'
        ? {
            valid: false,
            error: 'This slug is reserved and cannot be used',
            errorCode: 'SUBDOMAIN_RESERVED',
          }
        : { valid: true }
    ),
    isSlugAvailableForOrganization: mock(async () => input.available ?? true),
  }
}

describe('Organization settings use cases', () => {
  it('updates settings for admin or owner memberships', async () => {
    const memberships = createMemberships('admin')
    const settings = createSettingsRepository()
    const useCase = new UpdateOrganizationSettingsUseCase(memberships, settings, createSlugs())

    await useCase.execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      settings: { tagline: 'New tagline', brandColor: '#0103B8', font: 'ibm-plex-sans' },
    })

    expect(memberships.findMembership).toHaveBeenCalledWith('user-1', 'org-1')
    expect(settings.updateSettings).toHaveBeenCalledWith('org-1', {
      tagline: 'New tagline',
      brandColor: '#0103B8',
      font: 'ibm-plex-sans',
    })
  })

  it('rejects settings updates for non-admin members', async () => {
    const settings = createSettingsRepository()
    const useCase = new UpdateOrganizationSettingsUseCase(
      createMemberships('member'),
      settings,
      createSlugs()
    )

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        actorId: 'user-1',
        settings: { tagline: 'New tagline' },
      })
    ).rejects.toThrow(OrganizationPermissionError)
    expect(settings.updateSettings).not.toHaveBeenCalled()
  })

  it('updates organization name and slug when the new slug is available', async () => {
    const settings = createSettingsRepository()
    const slugs = createSlugs()
    const useCase = new UpdateOrganizationSettingsUseCase(
      createMemberships('owner'),
      settings,
      slugs
    )

    await useCase.execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      settings: { name: 'New name', slug: ' new-slug ' },
    })

    expect(settings.findSlug).toHaveBeenCalledWith('org-1')
    expect(slugs.isSlugAvailableForOrganization).toHaveBeenCalledWith('new-slug', 'org-1')
    expect(settings.updateSettings).toHaveBeenCalledWith('org-1', {
      name: 'New name',
      slug: 'new-slug',
    })
  })

  it('allows keeping the current slug without treating it as a conflict', async () => {
    const settings = createSettingsRepository()
    const slugs = createSlugs({ available: false })
    const useCase = new UpdateOrganizationSettingsUseCase(
      createMemberships('owner'),
      settings,
      slugs
    )

    await useCase.execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      settings: { slug: 'ortelius' },
    })

    expect(slugs.isSlugAvailableForOrganization).not.toHaveBeenCalled()
    expect(settings.updateSettings).toHaveBeenCalledWith('org-1', { slug: 'ortelius' })
  })

  it('rejects unavailable organization slugs', async () => {
    const settings = createSettingsRepository()
    const useCase = new UpdateOrganizationSettingsUseCase(
      createMemberships('owner'),
      settings,
      createSlugs({ available: false })
    )

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        actorId: 'user-1',
        settings: { slug: 'taken-slug' },
      })
    ).rejects.toThrow(OrganizationSlugError)
    expect(settings.updateSettings).not.toHaveBeenCalled()
  })

  it('updates tax ID through the settings repository', async () => {
    const settings = createSettingsRepository()
    const useCase = new UpdateOrganizationTaxIdUseCase(createMemberships('owner'), settings)

    await useCase.execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      taxId: { taxIdType: 'vat', taxIdNumber: 'BE123' },
    })

    expect(settings.updateTaxId).toHaveBeenCalledWith('org-1', {
      taxIdType: 'vat',
      taxIdNumber: 'BE123',
    })
  })
})
