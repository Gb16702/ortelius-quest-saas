import { EmailService } from '../../../../emails/services/email.service'
import { EmailTemplate } from '../../../../emails/types'
import { teamChatService } from '../../messaging/team-chat'
import type {
  OrganizationLeavingMember,
  OrganizationMemberNotificationPort,
  OrganizationMemberRemoval,
} from '../application/ports'

export class OrganizationMemberNotificationAdapter implements OrganizationMemberNotificationPort {
  async notifyMemberRemoved(input: {
    organizationId: string
    member: OrganizationMemberRemoval
  }): Promise<void> {
    await Promise.all([
      EmailService.sendTemplatedEmail(
        EmailTemplate.LEFT_ORGANIZATION,
        {
          username: input.member.userName,
          organizationName: input.member.organizationName,
        },
        {
          to: input.member.userEmail,
          subject: `You were removed from ${input.member.organizationName}`,
          organizationId: input.organizationId,
        }
      ),
      teamChatService.notifyMemberLeft(
        input.organizationId,
        input.member.userId,
        input.member.userName
      ),
    ])
  }

  async notifyMemberLeft(input: {
    organizationId: string
    userId: string
    member: OrganizationLeavingMember
  }): Promise<void> {
    await Promise.all([
      EmailService.sendTemplatedEmail(
        EmailTemplate.LEFT_ORGANIZATION,
        {
          username: input.member.userName,
          organizationName: input.member.organizationName,
        },
        {
          to: input.member.userEmail,
          subject: `You left ${input.member.organizationName}`,
          organizationId: input.organizationId,
        }
      ),
      teamChatService.notifyMemberLeft(input.organizationId, input.userId, input.member.userName),
    ])
  }
}
