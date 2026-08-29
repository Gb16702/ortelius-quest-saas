import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member } from '../../../infrastructure/database/db/schemas/auth-schema'
import { request as requestTable } from '../../../infrastructure/database/db/schemas/request-schema'
import type { RequestAuthorizationPort } from '../application/ports'

type RequestAccessRow = {
  id: string
  requesterId: string | null
  receiverOrganizationId: string
}

export class RequestAuthorizationAdapter implements RequestAuthorizationPort {
  async canPerformRequestActions(requestId: string, userId: string): Promise<boolean> {
    try {
      const requestData = await this.getAssignmentScope(requestId)
      if (!requestData) return false

      const userRole = await this.getMemberRole(requestData.receiverOrganizationId, userId)
      if (!userRole) return false

      return ['admin', 'owner'].includes(userRole) || requestData.assignedToId === userId
    } catch {
      return false
    }
  }

  async canAssignRequests(organizationId: string, userId: string): Promise<boolean> {
    try {
      return !!(await this.getMemberRole(organizationId, userId))
    } catch {
      return false
    }
  }

  async canViewAssignedRequests(requestId: string, userId: string): Promise<boolean> {
    try {
      const requestData = await this.getAssignmentScope(requestId)
      if (!requestData) return false

      return (
        requestData.assignedToId === userId ||
        (await this.canAssignRequests(requestData.receiverOrganizationId, userId))
      )
    } catch {
      return false
    }
  }

  async getRequestOrganizationId(requestId: string): Promise<string | null> {
    const requestData = await db
      .select({ receiverOrganizationId: requestTable.receiverOrganizationId })
      .from(requestTable)
      .where(eq(requestTable.id, requestId))
      .limit(1)

    return requestData[0]?.receiverOrganizationId ?? null
  }

  async resolveAccessibleRequestById(requestId: string, userId: string): Promise<string | null> {
    const requestData = await this.getAccessScopeById(requestId)
    return await this.resolveAccessibleRequest(requestData, userId)
  }

  async resolveAccessibleRequestByNumber(
    requestNumber: string,
    userId: string
  ): Promise<string | null> {
    const requestData = await this.getAccessScopeByNumber(requestNumber)
    return await this.resolveAccessibleRequest(requestData, userId)
  }

  private async getAssignmentScope(requestId: string): Promise<{
    assignedToId: string | null
    receiverOrganizationId: string
  } | null> {
    const requestData = await db
      .select({
        assignedToId: requestTable.assignedToId,
        receiverOrganizationId: requestTable.receiverOrganizationId,
      })
      .from(requestTable)
      .where(eq(requestTable.id, requestId))
      .limit(1)

    return requestData[0] ?? null
  }

  private async getAccessScopeById(requestId: string): Promise<RequestAccessRow | null> {
    const requestData = await db
      .select({
        id: requestTable.id,
        requesterId: requestTable.requesterId,
        receiverOrganizationId: requestTable.receiverOrganizationId,
      })
      .from(requestTable)
      .where(eq(requestTable.id, requestId))
      .limit(1)

    return requestData[0] ?? null
  }

  private async getAccessScopeByNumber(requestNumber: string): Promise<RequestAccessRow | null> {
    const requestData = await db
      .select({
        id: requestTable.id,
        requesterId: requestTable.requesterId,
        receiverOrganizationId: requestTable.receiverOrganizationId,
      })
      .from(requestTable)
      .where(eq(requestTable.reqNumber, requestNumber))
      .limit(1)

    return requestData[0] ?? null
  }

  private async resolveAccessibleRequest(
    requestData: RequestAccessRow | null,
    userId: string
  ): Promise<string | null> {
    if (!requestData) return null
    if (requestData.requesterId === userId) return requestData.id

    const hasMembership = await this.canAssignRequests(requestData.receiverOrganizationId, userId)
    return hasMembership ? requestData.id : null
  }

  private async getMemberRole(organizationId: string, userId: string): Promise<string | null> {
    const memberData = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
      .limit(1)

    return memberData[0]?.role ?? null
  }
}
