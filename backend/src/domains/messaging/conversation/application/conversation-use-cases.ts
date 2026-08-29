import type { ConversationSort, ConversationType } from '../../domain/messaging.types'
import { ConversationAccessDeniedError } from '../domain'
import { ConversationMemberDmValidationError } from '../domain/conversation-errors'
import type {
  ConversationAccessPort,
  ConversationMessagePort,
  ConversationParticipantPresencePort,
  ConversationRepositoryPort,
} from './ports'

export class GetUnreadConversationsCountUseCase {
  constructor(private readonly conversations: ConversationRepositoryPort) {}

  execute(command: { userId: string }) {
    return this.conversations.getUnreadConversationsCount(command.userId)
  }
}

export class ListUserConversationsUseCase {
  constructor(private readonly conversations: ConversationRepositoryPort) {}

  execute(command: {
    userId: string
    limit?: number
    offset?: number
    unreadOnly?: boolean
    searchQuery?: string
    conversationType?: ConversationType
    sort?: ConversationSort
  }) {
    return this.conversations.getUserConversations(
      command.userId,
      command.limit,
      command.offset,
      command.unreadOnly,
      command.searchQuery,
      command.conversationType,
      command.sort
    )
  }
}

export class ResolveMemberDmConversationUseCase {
  constructor(private readonly conversations: ConversationRepositoryPort) {}

  execute(command: { organizationId: string; currentUserId: string; targetUserId: string }) {
    if (command.currentUserId === command.targetUserId) {
      throw new ConversationMemberDmValidationError('Cannot start a member DM with yourself')
    }

    return this.conversations.resolveMemberDmConversation(command)
  }
}

export class GetConversationMessagesUseCase {
  constructor(private readonly messages: ConversationMessagePort) {}

  execute(command: { conversationId: string; userId: string }) {
    return this.messages.getAllConversationMessages(command.conversationId, command.userId)
  }
}

export class SearchConversationMessagesUseCase {
  constructor(private readonly messages: ConversationMessagePort) {}

  execute(command: { conversationId: string; userId: string; query: string }) {
    return this.messages.searchConversationMessages(
      command.conversationId,
      command.userId,
      command.query
    )
  }
}

export class GetPinnedConversationMessagesUseCase {
  constructor(private readonly messages: ConversationMessagePort) {}

  execute(command: { conversationId: string; userId: string }) {
    return this.messages.getPinnedMessages(command.conversationId, command.userId)
  }
}

export class PinConversationUseCase {
  constructor(private readonly conversations: ConversationRepositoryPort) {}

  async execute(command: { conversationId: string; userId: string }) {
    await this.conversations.pinConversation(command.conversationId, command.userId)
    return { message: 'Conversation pinned successfully' }
  }
}

export class UnpinConversationUseCase {
  constructor(private readonly conversations: ConversationRepositoryPort) {}

  async execute(command: { conversationId: string; userId: string }) {
    await this.conversations.unpinConversation(command.conversationId, command.userId)
    return { message: 'Conversation unpinned successfully' }
  }
}

export class GetConversationParticipantsUseCase {
  constructor(
    private readonly access: ConversationAccessPort,
    private readonly presence: ConversationParticipantPresencePort
  ) {}

  async execute(command: { conversationId: string; userId: string }) {
    const allowed = await this.access.canAccessConversation(command.conversationId, command.userId)
    if (!allowed) {
      throw new ConversationAccessDeniedError()
    }

    return this.presence.getConversationParticipants(command.conversationId)
  }
}
