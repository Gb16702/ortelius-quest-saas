import type {
  OrganizationMemberUserIdsQueryPort,
  OrganizationProfileQueryPort,
  OrganizationRealtimeNotifierPort,
} from './ports'

export class NotifyOrganizationRealtimeUpdateUseCase {
  constructor(
    private readonly profiles: OrganizationProfileQueryPort,
    private readonly memberships: OrganizationMemberUserIdsQueryPort,
    private readonly notifier: OrganizationRealtimeNotifierPort
  ) {}

  async execute(command: { organizationId: string; previousSlug?: string | null }): Promise<void> {
    const organization = await this.profiles.findInfo(command.organizationId)
    if (!organization?.slug) return

    const userIds = await this.memberships.listMemberUserIds(command.organizationId)
    if (userIds.length === 0) return

    await this.notifier.notifyOrganizationUpdated(userIds, {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo ?? null,
        brandLogo: organization.brandLogo ?? null,
        tagline: organization.tagline ?? null,
        brandColor: organization.brandColor,
        font: organization.font,
      },
      previousSlug: command.previousSlug ?? null,
    })
  }
}
