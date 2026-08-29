import {
  NotifyTeamChatMemberJoinedUseCase,
  NotifyTeamChatMemberLeftUseCase,
  NotifyTeamChatSettingChangeUseCase,
  SendTeamChatNotificationUseCase,
  ShareRequestToTeamChatUseCase,
} from '../application/team-chat-use-cases'
import { teamChatMessageAdapter, teamChatRepository } from './team-chat.repository'

let teamChatUseCases: {
  sendNotification: SendTeamChatNotificationUseCase
  notifySettingChange: NotifyTeamChatSettingChangeUseCase
  notifyMemberJoined: NotifyTeamChatMemberJoinedUseCase
  notifyMemberLeft: NotifyTeamChatMemberLeftUseCase
  shareRequest: ShareRequestToTeamChatUseCase
} | null = null

export async function getTeamChatUseCases() {
  if (!teamChatUseCases) {
    const sendNotification = new SendTeamChatNotificationUseCase(
      teamChatRepository,
      teamChatMessageAdapter
    )

    teamChatUseCases = {
      sendNotification,
      notifySettingChange: new NotifyTeamChatSettingChangeUseCase(
        teamChatRepository,
        sendNotification
      ),
      notifyMemberJoined: new NotifyTeamChatMemberJoinedUseCase(
        teamChatRepository,
        sendNotification
      ),
      notifyMemberLeft: new NotifyTeamChatMemberLeftUseCase(sendNotification),
      shareRequest: new ShareRequestToTeamChatUseCase(teamChatRepository, sendNotification),
    }
  }

  return teamChatUseCases
}
