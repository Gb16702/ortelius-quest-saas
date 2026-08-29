import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member } from '../../../infrastructure/database/db/schemas/auth-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'
import type { QuotePermissionPort } from '../application/ports'

export class QuotePermissionAdapter implements QuotePermissionPort {
  async canCreateQuote(requestId: string, userId: string): Promise<boolean> {
    const requestData = await db
      .select({
        assignedToId: request.assignedToId,
        receiverOrganizationId: request.receiverOrganizationId,
      })
      .from(request)
      .where(eq(request.id, requestId))
      .limit(1)

    if (!requestData.length) {
      return false
    }

    const { assignedToId, receiverOrganizationId } = requestData[0]
    const memberData = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.organizationId, receiverOrganizationId), eq(member.userId, userId)))
      .limit(1)

    if (!memberData.length) {
      return false
    }

    const userRole = memberData[0].role
    return (
      ['admin', 'owner'].includes(userRole) || (userRole === 'member' && assignedToId === userId)
    )
  }
}
