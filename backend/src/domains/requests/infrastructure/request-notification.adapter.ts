import type { NotificationPort } from '../application/ports'
import type { CreateRequestData, Request } from '../application/request-models'
import { RequestEmailNotificationAdapter } from './request-email-notification.adapter'
import { RequestInAppNotificationAdapter } from './request-in-app-notification.adapter'
import type {
  RequestEmailNotificationAdapterPort,
  RequestInAppNotificationAdapterPort,
  RequestNotificationMember,
  RequestNotificationQueryAdapterPort,
  RequestSystemMessageAdapterPort,
} from './request-notification.types'
import { RequestNotificationQueryAdapter } from './request-notification-query.adapter'
import { RequestSystemMessageAdapter } from './request-system-message.adapter'

export class RequestNotificationAdapter implements NotificationPort {
  constructor(
    private readonly email: RequestEmailNotificationAdapterPort = new RequestEmailNotificationAdapter(),
    private readonly inApp: RequestInAppNotificationAdapterPort = new RequestInAppNotificationAdapter(),
    private readonly systemMessages: RequestSystemMessageAdapterPort = new RequestSystemMessageAdapter(),
    private readonly queries: RequestNotificationQueryAdapterPort = new RequestNotificationQueryAdapter()
  ) {}

  async notifyRequestCreated(request: Request, data: CreateRequestData): Promise<void> {
    try {
      const isAnonymous = !data.requesterId
      await this.email.sendRequesterCreated(request, data, isAnonymous)

      const organization = await this.queries.getOrganization(data.receiverOrganizationId)
      const organizationName = organization.name || 'your organization'
      const allMembers = await this.queries.getOrganizationMembers(data.receiverOrganizationId)
      const admins = this.getAdminMembers(allMembers)

      for (const admin of admins) {
        await this.email.sendOrganizationRequestCreated(
          admin.user,
          request,
          data,
          organization,
          organizationName
        )
      }

      for (const member of allMembers) {
        if (member.user) {
          await this.inApp.notifyRequestUpdate(member.user.id, {
            requestId: request.id,
            lifecycleStatus: 'open',
            details: `${data.requesterName} sent you a request`,
            organizationName,
            requestNumber: request.reqNumber,
            action: 'request_received',
          })
        }
      }
    } catch (error) {
      console.error('Error sending request notifications:', error)
    }
  }

  async notifyRequestRejected(request: Request, userId: string, reason?: string): Promise<void> {
    try {
      const organization = await this.queries.getOrganization(request.receiverOrganizationId)
      const organizationName = organization.name || 'the organization'
      const requesterName = request.requesterId
        ? await this.queries.resolveUserName(request.requesterId, request.requesterName)
        : request.requesterName

      await this.email.sendRequesterRejected(request, requesterName, organizationName)

      const allMembers = await this.queries.getOrganizationMembers(request.receiverOrganizationId)
      const admins = this.getAdminMembers(allMembers)

      for (const admin of admins) {
        await this.email.sendOrganizationRequestRejected(admin.user, request, organization)
      }

      if (request.requesterId) {
        await this.inApp.notifyRequestUpdate(request.requesterId, {
          requestId: request.id,
          lifecycleStatus: 'closed',
          closedReason: 'request_rejected',
          details: `Your request ${request.reqNumber} has been rejected by ${organizationName}${reason ? `: ${reason}` : ''}`,
          organizationName,
          requestNumber: request.reqNumber,
          action: 'request_rejected',
        })
      }

      if (request.conversationId) {
        await this.systemMessages.createSystemMessage({
          conversationId: request.conversationId,
          content: `Request ${request.reqNumber} has been rejected${reason ? `: ${reason}` : ''}`,
          senderId: userId,
          metadata: {
            systemEventKey: 'requests.event.rejected',
            systemEventParams: {
              requestNumber: request.reqNumber,
              reason: reason ?? null,
            },
          },
        })
      }
    } catch (error) {
      console.error('Error sending rejection notifications:', error)
    }
  }

  async notifyRequestCanceled(request: Request, userId: string): Promise<void> {
    try {
      const organization = await this.queries.getOrganization(request.receiverOrganizationId)
      const organizationName = organization.name || 'the organization'
      const requesterName = request.requesterId
        ? await this.queries.resolveUserName(request.requesterId, request.requesterName)
        : request.requesterName

      await this.email.sendRequesterCanceled(request, requesterName, organizationName)

      const allMembers = await this.queries.getOrganizationMembers(request.receiverOrganizationId)
      const admins = this.getAdminMembers(allMembers)

      for (const admin of admins) {
        await this.email.sendOrganizationRequestCanceled(
          admin.user,
          request,
          requesterName,
          organization
        )
      }

      for (const member of allMembers) {
        if (member.user) {
          await this.inApp.notifyRequestUpdate(member.user.id, {
            requestId: request.id,
            lifecycleStatus: 'closed',
            closedReason: 'cancelled',
            details: `${requesterName} canceled their request ${request.reqNumber}`,
            organizationName,
            requestNumber: request.reqNumber,
            action: 'request_canceled',
          })
        }
      }

      if (request.conversationId) {
        await this.systemMessages.createSystemMessage({
          conversationId: request.conversationId,
          content: `Request ${request.reqNumber} has been canceled by ${requesterName}`,
          senderId: userId,
          metadata: {
            systemEventKey: 'requests.event.canceled',
            systemEventParams: {
              requestNumber: request.reqNumber,
              requesterName,
            },
          },
        })
      }
    } catch (error) {
      console.error('Error sending cancellation notifications:', error)
    }
  }

  async notifyDraftValidated(request: Request): Promise<void> {
    try {
      const organization = await this.queries.getOrganization(request.receiverOrganizationId)
      const organizationName = organization.name || 'the organization'
      const allMembers = await this.queries.getOrganizationMembers(request.receiverOrganizationId)

      for (const member of allMembers) {
        if (member.user) {
          await this.inApp.notifyRequestUpdate(member.user.id, {
            requestId: request.id,
            lifecycleStatus: 'open',
            details: `Draft request ${request.reqNumber} has been validated and is now open`,
            organizationName,
            requestNumber: request.reqNumber,
            action: 'request_submitted',
          })
        }
      }
    } catch (error) {
      console.error('Error sending validation notifications:', error)
    }
  }

  async notifyRequestAssigned(
    request: Request,
    assignedToId: string,
    assignedById: string
  ): Promise<void> {
    if (assignedToId === assignedById) return

    try {
      const assignedByUser = await this.queries.resolveUserProfile(assignedById)
      const assignedByName = assignedByUser.name || 'Someone'
      const assignedByImage = assignedByUser.image
      const organization = await this.queries.getOrganization(request.receiverOrganizationId)
      const organizationName = organization.name || 'the organization'

      await this.inApp.notifyRequestUpdate(assignedToId, {
        requestId: request.id,
        lifecycleStatus: request.lifecycleStatus,
        closedReason: request.closedReason,
        details: `${assignedByName} assigned request ${request.reqNumber} to you`,
        organizationName,
        requestNumber: request.reqNumber,
        assignedByName,
        assignedByImage,
        action: 'request_assigned',
      })

      if (request.conversationId) {
        const memberName = assignedByName === 'Someone' ? null : assignedByName
        await this.systemMessages.createSystemMessage({
          conversationId: request.conversationId,
          content: `Request ${request.reqNumber} has been assigned to ${memberName ?? 'a team member'}`,
          senderId: assignedById,
          metadata: {
            systemEventKey: 'requests.event.assigned',
            systemEventParams: {
              requestNumber: request.reqNumber,
              memberName,
            },
          },
        })
      }
    } catch (error) {
      console.error('Error sending assignment notifications:', error)
    }
  }

  async notifyRequestReassigned(
    request: Request,
    assignedToId: string,
    assignedById: string
  ): Promise<void> {
    if (assignedToId === assignedById) return

    try {
      const assignedByUser = await this.queries.resolveUserProfile(assignedById)
      const assignedByName = assignedByUser.name || 'Someone'
      const assignedByImage = assignedByUser.image
      const organization = await this.queries.getOrganization(request.receiverOrganizationId)
      const organizationName = organization.name || 'the organization'

      await this.inApp.notifyRequestUpdate(assignedToId, {
        requestId: request.id,
        lifecycleStatus: request.lifecycleStatus,
        closedReason: request.closedReason,
        details: `${assignedByName} reassigned request ${request.reqNumber} to you`,
        organizationName,
        requestNumber: request.reqNumber,
        assignedByName,
        assignedByImage,
        action: 'request_reassigned',
      })

      if (request.conversationId) {
        const memberName = assignedByName === 'Someone' ? null : assignedByName
        await this.systemMessages.createSystemMessage({
          conversationId: request.conversationId,
          content: `Request ${request.reqNumber} has been reassigned to ${memberName ?? 'a team member'}`,
          senderId: assignedById,
          metadata: {
            systemEventKey: 'requests.event.reassigned',
            systemEventParams: {
              requestNumber: request.reqNumber,
              memberName,
            },
          },
        })
      }
    } catch (error) {
      console.error('Error sending reassignment notifications:', error)
    }
  }

  async notifyRequestUnassigned(
    request: Request,
    unassignedById: string,
    previousAssignedToId?: string | null
  ): Promise<void> {
    if (!previousAssignedToId || previousAssignedToId === unassignedById) return

    try {
      const unassignedByUser = await this.queries.resolveUserProfile(unassignedById)
      const unassignedByName = unassignedByUser.name || 'Someone'
      const unassignedByImage = unassignedByUser.image
      const organization = await this.queries.getOrganization(request.receiverOrganizationId)
      const organizationName = organization.name || 'the organization'

      await this.inApp.notifyRequestUpdate(previousAssignedToId, {
        requestId: request.id,
        lifecycleStatus: request.lifecycleStatus,
        closedReason: request.closedReason,
        details: `${unassignedByName} unassigned you from request ${request.reqNumber}`,
        organizationName,
        requestNumber: request.reqNumber,
        assignedByName: unassignedByName,
        assignedByImage: unassignedByImage,
        action: 'request_unassigned',
      })

      if (request.conversationId) {
        await this.systemMessages.createSystemMessage({
          conversationId: request.conversationId,
          content: `Request ${request.reqNumber} has been unassigned`,
          senderId: unassignedById,
          metadata: {
            systemEventKey: 'requests.event.unassigned',
            systemEventParams: {
              requestNumber: request.reqNumber,
            },
          },
        })
      }
    } catch (error) {
      console.error('Error sending unassignment notifications:', error)
    }
  }

  private getAdminMembers(members: RequestNotificationMember[]) {
    return members.filter((member) => {
      return !!member.user && (member.role === 'admin' || member.role === 'owner')
    }) as Array<
      RequestNotificationMember & { user: NonNullable<RequestNotificationMember['user']> }
    >
  }
}
