import { deriveOrganizationSetupStatus, type OrganizationSetupStatus } from '../domain'
import type { OrganizationMembershipQueryPort, OrganizationSetupQueryPort } from './ports'

export class GetOrganizationSetupStatusUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly setup: OrganizationSetupQueryPort
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
  }): Promise<OrganizationSetupStatus> {
    const membership = await this.memberships.findMembership(
      command.actorId,
      command.organizationId
    )

    if (!membership) {
      throw new Error('User is not a member of this organization')
    }

    const snapshot = await this.setup.getSetupSnapshot(command.organizationId)
    return deriveOrganizationSetupStatus(snapshot)
  }
}
