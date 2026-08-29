import { realtimeService } from '../../../realtime/infrastructure/realtime.service'
import type { ConversationParticipantPresencePort } from '../application/ports'

export class RealtimeConversationPresenceAdapter implements ConversationParticipantPresencePort {
  getConversationParticipants(conversationId: string): Promise<unknown[]> {
    return realtimeService.getConversationParticipants(conversationId)
  }
}
