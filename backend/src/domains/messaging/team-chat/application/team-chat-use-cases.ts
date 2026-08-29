import type { Message } from '../../domain/messaging.types'
import {
  buildMemberJoinedNotification,
  buildMemberLeftNotification,
  buildRequestSharedNotification,
  buildSettingChangeNotification,
  type TeamChatNotification,
} from '../domain'
import type { TeamChatMessagePort, TeamChatRepositoryPort } from './ports'

export class SendTeamChatNotificationUseCase {
  constructor(
    private readonly repository: TeamChatRepositoryPort,
    private readonly messages: TeamChatMessagePort
  ) {}

  async execute(notification: TeamChatNotification): Promise<Message | null> {
    const teamChatId = await this.repository.getTeamChatId(notification.organizationId)
    if (!teamChatId) {
      console.warn(`[TeamChat] No team chat found for organization ${notification.organizationId}`)
      return null
    }

    return this.messages.createSystemMessage({
      conversationId: teamChatId,
      senderId: notification.actorId,
      content: notification.content,
      metadata: notification.metadata,
    })
  }
}

export class NotifyTeamChatSettingChangeUseCase {
  constructor(
    private readonly repository: TeamChatRepositoryPort,
    private readonly sender: SendTeamChatNotificationUseCase
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    settingName: string
    enabled: boolean
  }): Promise<Message | null> {
    const actorName = (await this.repository.getUserName(command.actorId)) || 'Someone'
    return this.sender.execute(
      buildSettingChangeNotification({
        ...command,
        actorName,
      })
    )
  }
}

export class NotifyTeamChatMemberJoinedUseCase {
  constructor(
    private readonly repository: TeamChatRepositoryPort,
    private readonly sender: SendTeamChatNotificationUseCase
  ) {}

  async execute(command: {
    organizationId: string
    userId: string
    userName?: string
  }): Promise<Message | null> {
    const userName =
      command.userName || (await this.repository.getUserName(command.userId)) || 'Someone'
    return this.sender.execute(
      buildMemberJoinedNotification({
        organizationId: command.organizationId,
        userId: command.userId,
        userName,
      })
    )
  }
}

export class NotifyTeamChatMemberLeftUseCase {
  constructor(private readonly sender: SendTeamChatNotificationUseCase) {}

  execute(command: {
    organizationId: string
    userId: string
    userName: string
  }): Promise<Message | null> {
    return this.sender.execute(buildMemberLeftNotification(command))
  }
}

export class ShareRequestToTeamChatUseCase {
  constructor(
    private readonly repository: TeamChatRepositoryPort,
    private readonly sender: SendTeamChatNotificationUseCase
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    requestId: string
    requestNumber: string
  }): Promise<Message | null> {
    const actorName = (await this.repository.getUserName(command.actorId)) || 'Someone'
    return this.sender.execute(
      buildRequestSharedNotification({
        ...command,
        actorName,
      })
    )
  }
}
