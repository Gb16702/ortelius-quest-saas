import { hasRequiredOrganizationRole } from '../domain'
import { OrganizationPermissionError } from './organization-errors'
import type {
  OrganizationMembershipQueryPort,
  OrganizationSettingsRepositoryPort,
  OrganizationSettingsUpdate,
  OrganizationSlugPort,
  OrganizationTaxIdUpdate,
} from './ports'

export class OrganizationSlugError extends Error {
  constructor(
    message: string,
    readonly errorCode: string,
    readonly status: 400 | 409 = 400
  ) {
    super(message)
    this.name = 'OrganizationSlugError'
  }
}

export class UpdateOrganizationSettingsUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly settings: OrganizationSettingsRepositoryPort,
    private readonly slugs: OrganizationSlugPort
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    settings: OrganizationSettingsUpdate
  }): Promise<void> {
    await this.assertCanEdit(command.actorId, command.organizationId)
    await this.validateSlugChange(command.organizationId, command.settings)
    await this.settings.updateSettings(command.organizationId, command.settings)
  }

  private async validateSlugChange(
    organizationId: string,
    settings: OrganizationSettingsUpdate
  ): Promise<void> {
    if (settings.slug === undefined) {
      return
    }

    const slug = settings.slug.trim()
    settings.slug = slug

    const validation = this.slugs.validateSlug(slug)
    if (!validation.valid) {
      throw new OrganizationSlugError(validation.error, validation.errorCode)
    }

    const currentSlug = await this.settings.findSlug(organizationId)
    if (currentSlug === slug) {
      return
    }

    if (!(await this.slugs.isSlugAvailableForOrganization(slug, organizationId))) {
      throw new OrganizationSlugError('Organization slug is already taken', 'SUBDOMAIN_TAKEN', 409)
    }
  }

  private async assertCanEdit(actorId: string, organizationId: string): Promise<void> {
    const membership = await this.memberships.findMembership(actorId, organizationId)
    if (!membership) {
      throw new OrganizationPermissionError('User is not a member of this organization')
    }

    if (!hasRequiredOrganizationRole(membership.role, 'admin')) {
      throw new OrganizationPermissionError()
    }
  }
}

export class UpdateOrganizationTaxIdUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly settings: OrganizationSettingsRepositoryPort
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    taxId: OrganizationTaxIdUpdate
  }): Promise<void> {
    await this.assertCanEdit(command.actorId, command.organizationId)
    await this.settings.updateTaxId(command.organizationId, command.taxId)
  }

  private async assertCanEdit(actorId: string, organizationId: string): Promise<void> {
    const membership = await this.memberships.findMembership(actorId, organizationId)
    if (!membership) {
      throw new OrganizationPermissionError('User is not a member of this organization')
    }

    if (!hasRequiredOrganizationRole(membership.role, 'admin')) {
      throw new OrganizationPermissionError()
    }
  }
}
