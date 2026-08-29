import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member } from '../../../infrastructure/database/db/schemas/auth-schema'
import { quote } from '../../../infrastructure/database/db/schemas/quote-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'
import type { QuoteAccessDecision, QuoteAuthorizationPort } from '../application/ports'

export class QuoteAuthorizationAdapter implements QuoteAuthorizationPort {
  async resolveQuoteAccess(quoteId: string, userId: string): Promise<QuoteAccessDecision> {
    const existingQuote = await db
      .select({
        organizationId: quote.organizationId,
        requestId: quote.requestId,
        createdById: quote.createdById,
      })
      .from(quote)
      .where(eq(quote.id, quoteId))
      .limit(1)

    if (!existingQuote.length) {
      return 'not_found'
    }

    const quoteData = existingQuote[0]
    if (quoteData.createdById === userId) {
      return 'allowed'
    }

    const membership = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, quoteData.organizationId), eq(member.userId, userId)))
      .limit(1)

    if (membership.length > 0) {
      return 'allowed'
    }

    const requestData = await db
      .select({ requesterId: request.requesterId })
      .from(request)
      .where(eq(request.id, quoteData.requestId))
      .limit(1)

    return requestData[0]?.requesterId === userId ? 'allowed' : 'forbidden'
  }

  async resolveRequestAccess(requestId: string, userId: string): Promise<QuoteAccessDecision> {
    const requestData = await db
      .select({
        requesterId: request.requesterId,
        receiverOrganizationId: request.receiverOrganizationId,
      })
      .from(request)
      .where(eq(request.id, requestId))
      .limit(1)

    const targetRequest = requestData[0]
    if (!targetRequest) {
      return 'not_found'
    }

    if (targetRequest.requesterId === userId) {
      return 'allowed'
    }

    const membership = await db
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, targetRequest.receiverOrganizationId),
          eq(member.userId, userId)
        )
      )
      .limit(1)

    return membership.length > 0 ? 'allowed' : 'forbidden'
  }
}
