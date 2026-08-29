import { teamChatService } from '../../messaging/team-chat'
import type { RequestTeamChatMessage, RequestTeamChatPort } from '../application/ports'

export class RequestTeamChatAdapter implements RequestTeamChatPort {
  async shareRequest(data: {
    organizationId: string
    actorId: string
    requestId: string
    requestNumber: string
  }): Promise<RequestTeamChatMessage | null> {
    return await teamChatService.shareRequest(
      data.organizationId,
      data.actorId,
      data.requestId,
      data.requestNumber
    )
  }
}
