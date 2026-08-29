import { EmailService } from '../../../../emails/services/email.service'
import { EmailTemplate } from '../../../../emails/types'
import { buildAuthLink } from '../../../infrastructure/auth/auth-link'
import type { CreateRequestData, Request } from '../application/request-models'
import type {
  RequestEmailNotificationAdapterPort,
  RequestNotificationMemberUser,
  RequestNotificationOrganization,
} from './request-notification.types'

export class RequestEmailNotificationAdapter implements RequestEmailNotificationAdapterPort {
  async sendRequesterCreated(
    request: Request,
    data: CreateRequestData,
    isAnonymous: boolean
  ): Promise<void> {
    await EmailService.sendTemplatedEmail(
      EmailTemplate.REQUEST_ONBOARDING,
      {
        username: data.requesterName,
        requestNumber: request.reqNumber,
        dashboardLink: buildAuthLink({
          email: data.requesterEmail,
          redirectPath: isAnonymous ? `/request/${request.id}` : '/me/requests',
        }),
        ...(isAnonymous && {
          isAnonymous: true,
          signupLink: buildAuthLink({
            email: data.requesterEmail,
            redirectPath: '/me/requests',
          }),
        }),
      },
      {
        to: data.requesterEmail,
        subject: `Request ${request.reqNumber} submitted successfully`,
        organizationId: data.receiverOrganizationId,
      }
    )
  }

  async sendOrganizationRequestCreated(
    admin: RequestNotificationMemberUser,
    request: Request,
    data: CreateRequestData,
    organization: RequestNotificationOrganization,
    organizationName: string
  ): Promise<void> {
    await EmailService.sendTemplatedEmail(
      EmailTemplate.ORGANIZATION_NOTIFICATION,
      {
        username: admin.name,
        requestNumber: request.reqNumber,
        requesterName: data.requesterName,
        organizationName,
        dashboardLink: buildAuthLink({
          email: admin.email,
          redirectPath: `/org/${organization.slug}/dashboard`,
        }),
      },
      {
        to: admin.email,
        subject: `New request ${request.reqNumber} received for ${organizationName}`,
        organizationId: data.receiverOrganizationId,
      }
    )
  }

  async sendRequesterRejected(
    request: Request,
    requesterName: string,
    organizationName: string
  ): Promise<void> {
    if (!request.requesterEmail) return

    await EmailService.sendTemplatedEmail(
      EmailTemplate.REQUEST_REJECTED,
      {
        username: requesterName,
        requestNumber: request.reqNumber,
        organizationName,
        dashboardLink: buildAuthLink({
          email: request.requesterEmail,
          redirectPath: request.requesterId
            ? `/dashboard/requests/${request.id}`
            : `/request/${request.id}`,
        }),
      },
      {
        to: request.requesterEmail,
        subject: `Request ${request.reqNumber} has been rejected`,
        organizationId: request.receiverOrganizationId,
      }
    )
  }

  async sendOrganizationRequestRejected(
    admin: RequestNotificationMemberUser,
    request: Request,
    organization: RequestNotificationOrganization
  ): Promise<void> {
    await EmailService.sendTemplatedEmail(
      EmailTemplate.REQUEST_REJECTED_ORGANIZATION,
      {
        username: admin.name,
        requestNumber: request.reqNumber,
        requesterName: request.requesterName,
        dashboardLink: buildAuthLink({
          email: admin.email,
          redirectPath: `/org/${organization.slug}/requests`,
        }),
      },
      {
        to: admin.email,
        subject: `Request ${request.reqNumber} rejected by your organization`,
        organizationId: request.receiverOrganizationId,
      }
    )
  }

  async sendRequesterCanceled(
    request: Request,
    requesterName: string,
    organizationName: string
  ): Promise<void> {
    if (!request.requesterEmail) return

    await EmailService.sendTemplatedEmail(
      EmailTemplate.REQUEST_CANCELED,
      {
        username: requesterName,
        requestNumber: request.reqNumber,
        organizationName,
        dashboardLink: buildAuthLink({
          email: request.requesterEmail,
          redirectPath: request.requesterId
            ? `/dashboard/requests/${request.id}`
            : `/request/${request.id}`,
        }),
      },
      {
        to: request.requesterEmail,
        subject: `Request ${request.reqNumber} has been canceled`,
        organizationId: request.receiverOrganizationId,
      }
    )
  }

  async sendOrganizationRequestCanceled(
    admin: RequestNotificationMemberUser,
    request: Request,
    requesterName: string,
    organization: RequestNotificationOrganization
  ): Promise<void> {
    await EmailService.sendTemplatedEmail(
      EmailTemplate.REQUEST_CANCELED_ORGANIZATION,
      {
        username: admin.name,
        requestNumber: request.reqNumber,
        requesterName,
        dashboardLink: buildAuthLink({
          email: admin.email,
          redirectPath: `/org/${organization.slug}/requests`,
        }),
      },
      {
        to: admin.email,
        subject: `Request ${request.reqNumber} canceled by requester`,
        organizationId: request.receiverOrganizationId,
      }
    )
  }
}
