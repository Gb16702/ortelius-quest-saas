import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../infrastructure/database'
import { anonymousUser } from '../../../infrastructure/database/db/schemas/auth-schema'
import {
  conversation,
  conversationParticipant,
} from '../../../infrastructure/database/db/schemas/chat-schema'
import type {
  RequestConversationAnonymousRequester,
  RequestConversationParticipant,
  RequestConversationPersistenceAdapterPort,
} from './request-conversation.types'

export class RequestConversationPersistenceAdapter
  implements RequestConversationPersistenceAdapterPort
{
  async addParticipants(participants: RequestConversationParticipant[]): Promise<void> {
    if (!participants.length) return
    await db.insert(conversationParticipant).values(participants)
  }

  async createAnonymousUser(data: {
    email: string
    name: string
  }): Promise<RequestConversationAnonymousRequester> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const rows = await db
      .insert(anonymousUser)
      .values({
        id: nanoid(),
        email: data.email,
        name: data.name,
        expiresAt,
      })
      .returning({
        id: anonymousUser.id,
        email: anonymousUser.email,
        name: anonymousUser.name,
      })

    return rows[0]
  }

  async createConversation(data: {
    anonymousRequesterId?: string | null
    createdBy: string
    description: string
    name: string
    organizationId: string
    requesterId?: string | null
  }): Promise<string> {
    const rows = await db
      .insert(conversation)
      .values({
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        organizationId: data.organizationId,
        requesterId: data.requesterId ?? null,
        anonymousRequesterId: data.anonymousRequesterId ?? null,
      })
      .returning({ id: conversation.id })

    return rows[0].id
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await db.delete(conversation).where(eq(conversation.id, conversationId))
  }

  async ensureParticipant(conversationId: string, userId: string): Promise<void> {
    const existingParticipant = await db
      .select({ id: conversationParticipant.id })
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.userId, userId)
        )
      )
      .limit(1)

    if (existingParticipant.length) return

    await db.insert(conversationParticipant).values({
      conversationId,
      userId,
      role: 'member',
    })
  }

  async updateConversationRequester(conversationId: string, requesterId: string): Promise<void> {
    await db
      .update(conversation)
      .set({
        requesterId,
        anonymousRequesterId: null,
        updatedAt: new Date(),
      })
      .where(eq(conversation.id, conversationId))
  }
}
