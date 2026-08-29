import type { Message } from '../domain/messaging.types'
import type { TeamChatNotification } from './domain'

async function getUseCases() {
  const { getTeamChatUseCases } = await import('./infrastructure/team-chat-use-cases')
  return getTeamChatUseCases()
}

export class TeamChatApplicationService {
  async sendNotification(data: TeamChatNotification): Promise<Message | null> {
    const useCases = await getUseCases()
    return useCases.sendNotification.execute(data)
  }

  async notifySettingChange(
    organizationId: string,
    actorId: string,
    settingName: string,
    enabled: boolean
  ): Promise<Message | null> {
    const useCases = await getUseCases()
    return useCases.notifySettingChange.execute({
      organizationId,
      actorId,
      settingName,
      enabled,
    })
  }

  async notifyMemberJoined(
    organizationId: string,
    userId: string,
    userName?: string
  ): Promise<Message | null> {
    const useCases = await getUseCases()
    return useCases.notifyMemberJoined.execute({ organizationId, userId, userName })
  }

  async notifyMemberLeft(
    organizationId: string,
    userId: string,
    userName: string
  ): Promise<Message | null> {
    const useCases = await getUseCases()
    return useCases.notifyMemberLeft.execute({ organizationId, userId, userName })
  }

  async shareRequest(
    organizationId: string,
    actorId: string,
    requestId: string,
    requestNumber: string
  ): Promise<Message | null> {
    const useCases = await getUseCases()
    return useCases.shareRequest.execute({
      organizationId,
      actorId,
      requestId,
      requestNumber,
    })
  }
}

export const teamChatApplicationService = new TeamChatApplicationService()
