import {
  GetConversationMessagesUseCase,
  GetConversationParticipantsUseCase,
  GetPinnedConversationMessagesUseCase,
  GetUnreadConversationsCountUseCase,
  ListUserConversationsUseCase,
  PinConversationUseCase,
  ResolveMemberDmConversationUseCase,
  SearchConversationMessagesUseCase,
  UnpinConversationUseCase,
} from '../application/conversation-use-cases'
import { conversationRepository } from './conversation.repository'
import {
  MessageServiceConversationAccessAdapter,
  MessageServiceConversationMessageAdapter,
} from './conversation-message.adapter'
import { RealtimeConversationPresenceAdapter } from './conversation-presence.adapter'

let conversationUseCases: {
  getUnreadCount: GetUnreadConversationsCountUseCase
  listUserConversations: ListUserConversationsUseCase
  getMessages: GetConversationMessagesUseCase
  searchMessages: SearchConversationMessagesUseCase
  getPinnedMessages: GetPinnedConversationMessagesUseCase
  pin: PinConversationUseCase
  unpin: UnpinConversationUseCase
  getParticipants: GetConversationParticipantsUseCase
  resolveMemberDm: ResolveMemberDmConversationUseCase
} | null = null

export async function getConversationUseCases() {
  if (!conversationUseCases) {
    const messages = new MessageServiceConversationMessageAdapter()
    const access = new MessageServiceConversationAccessAdapter()
    const presence = new RealtimeConversationPresenceAdapter()

    conversationUseCases = {
      getUnreadCount: new GetUnreadConversationsCountUseCase(conversationRepository),
      listUserConversations: new ListUserConversationsUseCase(conversationRepository),
      getMessages: new GetConversationMessagesUseCase(messages),
      searchMessages: new SearchConversationMessagesUseCase(messages),
      getPinnedMessages: new GetPinnedConversationMessagesUseCase(messages),
      pin: new PinConversationUseCase(conversationRepository),
      unpin: new UnpinConversationUseCase(conversationRepository),
      getParticipants: new GetConversationParticipantsUseCase(access, presence),
      resolveMemberDm: new ResolveMemberDmConversationUseCase(conversationRepository),
    }
  }

  return conversationUseCases
}
