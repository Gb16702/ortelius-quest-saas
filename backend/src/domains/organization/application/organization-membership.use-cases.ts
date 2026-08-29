import type {
  OrganizationMembershipQueryPort,
  UserOrganizationRecord,
  UserOrganizationsQueryPort,
} from './ports'

export class GetOrganizationUserRoleUseCase {
  constructor(private readonly memberships: OrganizationMembershipQueryPort) {}

  async execute(command: { organizationId: string; actorId: string }): Promise<string | null> {
    const membership = await this.memberships.findMembership(
      command.actorId,
      command.organizationId
    )
    return membership?.role ?? null
  }
}

export class ListUserOrganizationsUseCase {
  constructor(private readonly organizations: UserOrganizationsQueryPort) {}

  async execute(command: { userId: string }): Promise<UserOrganizationRecord[]> {
    return await this.organizations.listUserOrganizations(command.userId)
  }
}
