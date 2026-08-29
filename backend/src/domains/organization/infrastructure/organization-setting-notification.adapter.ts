import { teamChatService } from '../../messaging/team-chat'
import type { OrganizationSettingNotificationPort } from '../application/ports'

export class TeamChatOrganizationSettingNotificationAdapter
  implements OrganizationSettingNotificationPort
{
  async notifySettingChange(
    organizationId: string,
    actorId: string,
    settingName: string,
    enabled: boolean
  ): Promise<void> {
    await teamChatService.notifySettingChange(organizationId, actorId, settingName, enabled)
  }
}
