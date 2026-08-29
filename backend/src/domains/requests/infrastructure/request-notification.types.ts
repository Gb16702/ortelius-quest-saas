import type { RequestNotificationData } from '../../notifications/application/notification-models'
import type { CreateRequestData, Request } from '../application/request-models'

export type { RequestSystemMessageAdapterPort } from './request-system-message.types'

export type RequestNotificationOrganization = {
  name?: string
  slug?: string
}

export type RequestNotificationMemberUser = {
  id: string
  name: string
  email: string
}

export type RequestNotificationMember = {
  role?: string
  user?: RequestNotificationMemberUser | null
}

export type RequestNotificationUserProfile = {
  name?: string
  image: string | null
}

export type RequestUpdateNotification = RequestNotificationData

export interface RequestNotificationQueryAdapterPort {
  getOrganization(organizationId: string): Promise<RequestNotificationOrganization>
  getOrganizationMembers(organizationId: string): Promise<RequestNotificationMember[]>
  resolveUserName(userId: string, fallback: string): Promise<string>
  resolveUserProfile(userId: string): Promise<RequestNotificationUserProfile>
}

export interface RequestEmailNotificationAdapterPort {
  sendRequesterCreated(
    request: Request,
    data: CreateRequestData,
    isAnonymous: boolean
  ): Promise<void>
  sendOrganizationRequestCreated(
    admin: RequestNotificationMemberUser,
    request: Request,
    data: CreateRequestData,
    organization: RequestNotificationOrganization,
    organizationName: string
  ): Promise<void>
  sendRequesterRejected(
    request: Request,
    requesterName: string,
    organizationName: string
  ): Promise<void>
  sendOrganizationRequestRejected(
    admin: RequestNotificationMemberUser,
    request: Request,
    organization: RequestNotificationOrganization
  ): Promise<void>
  sendRequesterCanceled(
    request: Request,
    requesterName: string,
    organizationName: string
  ): Promise<void>
  sendOrganizationRequestCanceled(
    admin: RequestNotificationMemberUser,
    request: Request,
    requesterName: string,
    organization: RequestNotificationOrganization
  ): Promise<void>
}

export interface RequestInAppNotificationAdapterPort {
  notifyRequestUpdate(userId: string, data: RequestUpdateNotification): Promise<void>
}
