import {
  buildInboundEmailAddress,
  hasRequiredOrganizationRole,
  type OrganizationEmailIntakeResult,
} from '../domain'
import { OrganizationNotFoundError, OrganizationPermissionError } from './organization-errors'
import type {
  OrganizationEmailIntakeRepositoryPort,
  OrganizationMembershipQueryPort,
  OrganizationSettingNotificationPort,
} from './ports'

export class UpdateOrganizationEmailIntakeUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly emailIntake: OrganizationEmailIntakeRepositoryPort,
    private readonly notifications: OrganizationSettingNotificationPort
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    enabled: boolean
  }): Promise<OrganizationEmailIntakeResult> {
    const membership = await this.memberships.findMembership(
      command.actorId,
      command.organizationId
    )
    if (!membership) {
      throw new OrganizationPermissionError('User is not a member of this organization')
    }

    if (!hasRequiredOrganizationRole(membership.role, 'admin')) {
      throw new OrganizationPermissionError()
    }

    const slug = await this.emailIntake.findSlug(command.organizationId)
    if (!slug) {
      throw new OrganizationNotFoundError()
    }

    await this.emailIntake.setEmailIntakeEnabled(command.organizationId, command.enabled)
    await this.notifications.notifySettingChange(
      command.organizationId,
      command.actorId,
      'Email Intake',
      command.enabled
    )

    return {
      success: true,
      emailAddress: buildInboundEmailAddress(slug, command.enabled),
    }
  }
}
