import { and, eq } from 'drizzle-orm'
import { db } from '../../../../infrastructure/database'
import { user } from '../../../../infrastructure/database/db/schemas/auth-schema'
import { conversation } from '../../../../infrastructure/database/db/schemas/chat-schema'
import type { Message } from '../../domain/messaging.types'
import { messageApplicationService } from '../../message/message.application'
import type { TeamChatMessagePort, TeamChatRepositoryPort } from '../application/ports'

export class DrizzleTeamChatRepository implements TeamChatRepositoryPort {
  async getTeamChatId(organizationId: string): Promise<string | null> {
    const teamChat = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(
        and(eq(conversation.organizationId, organizationId), eq(conversation.isTeamChat, true))
      )
      .limit(1)

    return teamChat[0]?.id || null
  }

  async getUserName(userId: string): Promise<string | null> {
    const [userRecord] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    return userRecord?.name ?? null
  }
}

export class MessageServiceTeamChatMessageAdapter implements TeamChatMessagePort {
  createSystemMessage(input: {
    conversationId: string
    senderId: string
    content: string
    metadata?: Record<string, unknown>
  }): Promise<Message> {
    return messageApplicationService.createSystemMessage(input)
  }
}

export const teamChatRepository = new DrizzleTeamChatRepository()
export const teamChatMessageAdapter = new MessageServiceTeamChatMessageAdapter()
