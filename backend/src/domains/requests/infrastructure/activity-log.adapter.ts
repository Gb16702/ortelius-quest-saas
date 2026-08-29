import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { activityApplicationService } from '../../activity/activity.application'
import type { ActivityLogPort } from '../application/ports'
import type { Request } from '../application/request-models'

export class ActivityLogAdapter implements ActivityLogPort {
  async logRequestCreated(request: Request, actorId: string): Promise<void> {
    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId,
      eventType: 'request-created',
      description: `submitted request ${request.reqNumber}`,
      metadata: { requestId: request.id, reqNumber: request.reqNumber },
    })
  }

  async logRequestUpdated(request: Request, actorId: string): Promise<void> {
    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId,
      eventType: 'request-updated',
      description: `updated request ${request.reqNumber}`,
      metadata: { requestId: request.id, reqNumber: request.reqNumber },
    })
  }

  async logRequestSharedToTeamChat(request: Request, actorId: string): Promise<void> {
    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId,
      eventType: 'request-shared-to-team-chat',
      description: `shared request ${request.reqNumber} to team chat`,
      metadata: { requestId: request.id, reqNumber: request.reqNumber },
    })
  }

  async logRequestDeleted(request: Request, actorId: string): Promise<void> {
    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId,
      eventType: 'request-deleted',
      description: `deleted draft request ${request.reqNumber}`,
      metadata: { requestId: request.id, reqNumber: request.reqNumber },
    })
  }

  async logRequestRejected(request: Request, actorId: string): Promise<void> {
    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId,
      eventType: 'request-rejected',
      description: `rejected request ${request.reqNumber}`,
      metadata: { requestId: request.id, reqNumber: request.reqNumber },
    })
  }

  async logRequestCanceled(request: Request, actorId: string): Promise<void> {
    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId,
      eventType: 'request-cancelled',
      description: `cancelled request ${request.reqNumber}`,
      metadata: { requestId: request.id, reqNumber: request.reqNumber },
    })
  }

  async logRequestValidated(request: Request, actorId: string): Promise<void> {
    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId,
      eventType: 'request-validated',
      description: `validated draft request ${request.reqNumber}`,
      metadata: { requestId: request.id, reqNumber: request.reqNumber },
    })
  }

  async logRequestAssigned(
    request: Request,
    assignedToId: string,
    assignedById: string,
    assigneeName?: string
  ): Promise<void> {
    const isSelfAssignment = assignedToId === assignedById
    const resolvedAssigneeName =
      assigneeName ??
      (isSelfAssignment ? undefined : await this.resolveUserName(assignedToId)) ??
      'a team member'
    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId: assignedById,
      eventType: 'request-assigned',
      description: isSelfAssignment
        ? `self-assigned request ${request.reqNumber}`
        : `assigned request ${request.reqNumber} to ${resolvedAssigneeName}`,
      metadata: {
        requestId: request.id,
        reqNumber: request.reqNumber,
        assignedToId,
        ...(isSelfAssignment ? {} : { userId: assignedToId, userName: resolvedAssigneeName }),
      },
    })
  }

  async logRequestReassigned(
    request: Request,
    assignedToId: string,
    assignedById: string
  ): Promise<void> {
    const isSelfReassignment = assignedToId === assignedById
    const assigneeName = isSelfReassignment
      ? undefined
      : (await this.resolveUserName(assignedToId)) || 'a team member'
    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId: assignedById,
      eventType: 'request-reassigned',
      description: isSelfReassignment
        ? `self-reassigned request ${request.reqNumber}`
        : `reassigned request ${request.reqNumber} to ${assigneeName}`,
      metadata: {
        requestId: request.id,
        reqNumber: request.reqNumber,
        assignedToId,
        ...(isSelfReassignment ? {} : { userId: assignedToId, userName: assigneeName }),
      },
    })
  }

  async logRequestUnassigned(
    request: Request,
    unassignedById: string,
    previousAssignedToId?: string | null
  ): Promise<void> {
    const isSelfUnassign = !!previousAssignedToId && previousAssignedToId === unassignedById
    const previousAssigneeName =
      previousAssignedToId && !isSelfUnassign
        ? await this.resolveUserName(previousAssignedToId)
        : undefined

    await this.log({
      organizationId: request.receiverOrganizationId,
      actorId: unassignedById,
      eventType: 'request-unassigned',
      description: isSelfUnassign
        ? `self-unassigned from request ${request.reqNumber}`
        : previousAssigneeName
          ? `unassigned ${previousAssigneeName} from request ${request.reqNumber}`
          : `unassigned request ${request.reqNumber}`,
      metadata: {
        requestId: request.id,
        reqNumber: request.reqNumber,
        ...(isSelfUnassign || !previousAssigneeName
          ? {}
          : { userId: previousAssignedToId, userName: previousAssigneeName }),
      },
    })
  }

  private async log(data: {
    organizationId: string
    actorId: string
    eventType: string
    description: string
    metadata: Record<string, unknown>
  }): Promise<void> {
    try {
      await activityApplicationService.logEvent(data)
    } catch (error) {
      console.error('[RequestsActivity] Failed to log event:', data.eventType, error)
    }
  }

  private async resolveUserName(userId: string): Promise<string | undefined> {
    try {
      const userData = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
      return userData[0]?.name
    } catch (error) {
      console.error('[RequestsActivity] Failed to resolve user name:', error)
      return undefined
    }
  }
}
