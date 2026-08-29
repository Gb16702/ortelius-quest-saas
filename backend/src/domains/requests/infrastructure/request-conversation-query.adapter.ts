import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import {
  anonymousUser,
  member,
  organization,
  user,
} from '../../../infrastructure/database/db/schemas/auth-schema'
import { conversation } from '../../../infrastructure/database/db/schemas/chat-schema'
import type {
  RequestConversationAnonymousRequester,
  RequestConversationMember,
  RequestConversationOrganization,
  RequestConversationQueryAdapterPort,
  RequestConversationRecord,
  RequestConversationUser,
} from './request-conversation.types'

export class RequestConversationQueryAdapter implements RequestConversationQueryAdapterPort {
  async getAnonymousUserByEmail(
    email: string
  ): Promise<RequestConversationAnonymousRequester | null> {
    const rows = await db
      .select({ id: anonymousUser.id, email: anonymousUser.email, name: anonymousUser.name })
      .from(anonymousUser)
      .where(eq(anonymousUser.email, email))
      .limit(1)

    return rows[0] ?? null
  }

  async getAnonymousUserById(id: string): Promise<RequestConversationAnonymousRequester | null> {
    const rows = await db
      .select({ id: anonymousUser.id, email: anonymousUser.email, name: anonymousUser.name })
      .from(anonymousUser)
      .where(eq(anonymousUser.id, id))
      .limit(1)

    return rows[0] ?? null
  }

  async getConversation(conversationId: string): Promise<RequestConversationRecord | null> {
    const rows = await db
      .select({
        id: conversation.id,
        anonymousRequesterId: conversation.anonymousRequesterId,
      })
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1)

    return rows[0] ?? null
  }

  async getFirstOrganizationMember(
    organizationId: string
  ): Promise<RequestConversationMember | null> {
    const rows = await db
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, organizationId))
      .limit(1)

    return rows[0] ?? null
  }

  async getOrganization(organizationId: string): Promise<RequestConversationOrganization | null> {
    const rows = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return rows[0] ?? null
  }

  async getOrganizationMembers(organizationId: string): Promise<RequestConversationMember[]> {
    return await db
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, organizationId))
  }

  async getUser(userId: string): Promise<RequestConversationUser | null> {
    const rows = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return rows[0] ?? null
  }

  async findConversationByAnonymousRequester(
    anonymousRequesterId: string,
    organizationId: string
  ): Promise<string | null> {
    const rows = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(
        and(
          eq(conversation.anonymousRequesterId, anonymousRequesterId),
          eq(conversation.organizationId, organizationId)
        )
      )
      .limit(1)

    return rows[0]?.id ?? null
  }

  async findConversationByRequester(
    requesterId: string,
    organizationId: string
  ): Promise<string | null> {
    const rows = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(
        and(
          eq(conversation.requesterId, requesterId),
          eq(conversation.organizationId, organizationId)
        )
      )
      .limit(1)

    return rows[0]?.id ?? null
  }

  async resolveUserName(userId: string, fallback: string): Promise<string> {
    const row = await this.getUser(userId)
    return row?.name || fallback
  }
}
