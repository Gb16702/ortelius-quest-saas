import type { OrganizationInfo, OrganizationProfile } from '../domain'
import type { OrganizationProfileQueryPort } from './ports'

export class GetOrganizationBySlugUseCase {
  constructor(private readonly organizations: OrganizationProfileQueryPort) {}

  async execute(command: { slug: string }): Promise<OrganizationProfile | null> {
    return await this.organizations.findBySlug(command.slug)
  }
}

export class GetOrganizationInfoUseCase {
  constructor(private readonly organizations: OrganizationProfileQueryPort) {}

  async execute(command: { organizationId: string }): Promise<OrganizationInfo | null> {
    return await this.organizations.findInfo(command.organizationId)
  }
}
