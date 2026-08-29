import { hasRequiredOrganizationRole, type OrganizationLogoUploadResult } from '../domain'
import { OrganizationNotFoundError, OrganizationPermissionError } from './organization-errors'
import type {
  OrganizationLogoActivityPort,
  OrganizationLogoRepositoryPort,
  OrganizationLogoStoragePort,
  OrganizationMembershipQueryPort,
} from './ports'

export class UpdateOrganizationLogoUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly logos: OrganizationLogoRepositoryPort,
    private readonly storage: OrganizationLogoStoragePort,
    private readonly activity: OrganizationLogoActivityPort
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    buffer: Buffer
    filename: string
    contentType: string
  }): Promise<OrganizationLogoUploadResult> {
    await this.assertCanEdit(command.actorId, command.organizationId)

    const currentLogo = await this.logos.findLogo(command.organizationId)
    if (!currentLogo) {
      throw new OrganizationNotFoundError()
    }

    const uploadResult = await this.storage.uploadLogo({
      buffer: command.buffer,
      filename: command.filename,
      contentType: command.contentType,
    })

    await this.logos.setLogo(command.organizationId, uploadResult.logoUrl)

    if (currentLogo.logo) {
      void this.storage.deleteLogoFiles(currentLogo.logo)
    }

    void this.activity.logLogoUpdated(command.organizationId, command.actorId)
    return uploadResult
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

export class RemoveOrganizationLogoUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly logos: OrganizationLogoRepositoryPort,
    private readonly storage: OrganizationLogoStoragePort,
    private readonly activity: OrganizationLogoActivityPort
  ) {}

  async execute(command: { organizationId: string; actorId: string }): Promise<void> {
    await this.assertCanEdit(command.actorId, command.organizationId)

    const currentLogo = await this.logos.findLogo(command.organizationId)
    if (!currentLogo) {
      throw new OrganizationNotFoundError()
    }

    if (!currentLogo.logo) {
      throw new Error('No logo to remove')
    }

    await this.logos.clearLogo(command.organizationId)
    void this.storage.deleteLogoFiles(currentLogo.logo)
    void this.activity.logLogoRemoved(command.organizationId, command.actorId)
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
