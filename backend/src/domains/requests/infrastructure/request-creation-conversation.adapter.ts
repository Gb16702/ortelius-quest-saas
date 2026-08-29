import type { RequestCreationConversationPort } from '../application/ports'
import type { CreateRequestData, Request } from '../application/request-models'
import type {
  RequestConversationAnonymousRequester,
  RequestConversationParticipant,
  RequestConversationPersistenceAdapterPort,
  RequestConversationQueryAdapterPort,
} from './request-conversation.types'
import type { RequestSystemMessageAdapterPort } from './request-system-message.types'

export class RequestCreationConversationAdapter implements RequestCreationConversationPort {
  constructor(
    private readonly queries: RequestConversationQueryAdapterPort,
    private readonly persistence: RequestConversationPersistenceAdapterPort,
    private readonly systemMessages: RequestSystemMessageAdapterPort
  ) {}

  async resolveCreatedRequestConversation(data: {
    request: Request
    createData: CreateRequestData
  }): Promise<string | null> {
    try {
      if (!data.createData.receiverOrganizationId) return null

      if (!data.createData.requesterId) {
        return await this.resolveAnonymousConversation(data.request, data.createData)
      }

      return await this.resolveAuthenticatedConversation(data.request, data.createData)
    } catch (error) {
      console.error('Failed to create request conversation:', error)
      return null
    }
  }

  private async resolveAnonymousConversation(
    request: Request,
    data: CreateRequestData
  ): Promise<string | null> {
    const anonymousRequester = await this.createOrGetAnonymousUser({
      email: data.requesterEmail,
      name: data.requesterName,
    })

    const existingConversationId = await this.queries.findConversationByAnonymousRequester(
      anonymousRequester.id,
      data.receiverOrganizationId
    )

    if (existingConversationId) {
      await this.createSystemMessageForExistingAnonymousConversation(
        existingConversationId,
        request,
        data,
        anonymousRequester.id
      )
      return existingConversationId
    }

    return await this.createAnonymousRequestConversation({
      id: request.id,
      reqNumber: request.reqNumber,
      anonymousRequester,
      receiverOrganizationId: data.receiverOrganizationId,
    })
  }

  private async resolveAuthenticatedConversation(
    request: Request,
    data: CreateRequestData
  ): Promise<string | null> {
    if (!data.requesterId) return null

    const existingConversationId = await this.queries.findConversationByRequester(
      data.requesterId,
      data.receiverOrganizationId
    )

    if (existingConversationId) {
      await this.createSystemMessageForExistingConversation(existingConversationId, request, data)
      return existingConversationId
    }

    return await this.createRequestConversation({
      id: request.id,
      reqNumber: request.reqNumber,
      requesterId: data.requesterId,
      receiverOrganizationId: data.receiverOrganizationId,
    })
  }

  private async createOrGetAnonymousUser(data: {
    email: string
    name: string
  }): Promise<RequestConversationAnonymousRequester> {
    const existingAnonymous = await this.queries.getAnonymousUserByEmail(data.email)
    if (existingAnonymous) return existingAnonymous

    return await this.persistence.createAnonymousUser(data)
  }

  private async createSystemMessageForExistingAnonymousConversation(
    conversationId: string,
    request: Request,
    data: CreateRequestData,
    anonymousRequesterId: string
  ): Promise<void> {
    const orgInfo = await this.queries.getOrganization(data.receiverOrganizationId)
    const firstOrgMember = await this.queries.getFirstOrganizationMember(
      data.receiverOrganizationId
    )
    const senderId = firstOrgMember?.userId || anonymousRequesterId

    await this.createSystemMessage({
      conversationId,
      content: `New request ${request.reqNumber} submitted by ${data.requesterName} to ${orgInfo?.name || 'the organization'}`,
      senderId,
      metadata: {
        requestId: request.id,
        requestNumber: request.reqNumber,
        eventType: 'request_submitted',
        systemEventKey: 'requests.event.submitted',
        systemEventParams: {
          requestNumber: request.reqNumber,
          requesterName: data.requesterName,
          organizationName: orgInfo?.name ?? null,
        },
      },
    })
  }

  private async createSystemMessageForExistingConversation(
    conversationId: string,
    request: Request,
    data: CreateRequestData
  ): Promise<void> {
    if (!data.requesterId) return

    const requesterInfo = await this.queries.getUser(data.requesterId)
    const orgInfo = await this.queries.getOrganization(data.receiverOrganizationId)

    const requesterName = requesterInfo?.name || data.requesterName
    await this.createSystemMessage({
      conversationId,
      content: `New request ${request.reqNumber} submitted by ${requesterName} to ${orgInfo?.name || 'the organization'}`,
      senderId: data.requesterId,
      metadata: {
        requestId: request.id,
        requestNumber: request.reqNumber,
        eventType: 'request_submitted',
        systemEventKey: 'requests.event.submitted',
        systemEventParams: {
          requestNumber: request.reqNumber,
          requesterName,
          organizationName: orgInfo?.name ?? null,
        },
      },
    })
  }

  private async createAnonymousRequestConversation(requestData: {
    id: string
    reqNumber: string
    anonymousRequester: RequestConversationAnonymousRequester
    receiverOrganizationId: string
  }): Promise<string> {
    const organizationInfo = await this.queries.getOrganization(requestData.receiverOrganizationId)

    if (!organizationInfo) {
      throw new Error('Receiver organization not found')
    }

    const firstOrgMember = await this.queries.getFirstOrganizationMember(
      requestData.receiverOrganizationId
    )

    if (!firstOrgMember) {
      throw new Error('No members found in the organization')
    }

    const conversationId = await this.persistence.createConversation({
      name: `${requestData.anonymousRequester.name}`,
      description: `Conversation for anonymous request ${requestData.reqNumber}`,
      createdBy: firstOrgMember.userId,
      organizationId: requestData.receiverOrganizationId,
      anonymousRequesterId: requestData.anonymousRequester.id,
    })

    const organizationMembers = await this.queries.getOrganizationMembers(
      requestData.receiverOrganizationId
    )

    const participants = organizationMembers.map((orgMember) => ({
      conversationId,
      userId: orgMember.userId,
      role: 'member',
    }))

    await this.persistence.addParticipants(participants)

    await this.createSystemMessage({
      conversationId,
      content: `New request ${requestData.reqNumber} submitted by ${requestData.anonymousRequester.name} to ${organizationInfo.name}`,
      senderId: firstOrgMember.userId,
      metadata: {
        requestId: requestData.id,
        requestNumber: requestData.reqNumber,
        eventType: 'request_submitted',
        systemEventKey: 'requests.event.submitted',
        systemEventParams: {
          requestNumber: requestData.reqNumber,
          requesterName: requestData.anonymousRequester.name,
          organizationName: organizationInfo.name,
        },
      },
    })

    return conversationId
  }

  private async createRequestConversation(requestData: {
    id: string
    reqNumber: string
    requesterId: string
    receiverOrganizationId: string
  }): Promise<string> {
    const requester = await this.queries.getUser(requestData.requesterId)

    if (!requester) {
      throw new Error('Requester not found')
    }

    const organizationInfo = await this.queries.getOrganization(requestData.receiverOrganizationId)

    if (!organizationInfo) {
      throw new Error('Receiver organization not found')
    }

    const conversationId = await this.persistence.createConversation({
      name: `Request ${requestData.reqNumber} - ${requester.name} & ${organizationInfo.name}`,
      description: `Conversation for request ${requestData.reqNumber}`,
      createdBy: requestData.requesterId,
      organizationId: requestData.receiverOrganizationId,
      requesterId: requestData.requesterId,
    })

    const participants: RequestConversationParticipant[] = [
      {
        conversationId,
        userId: requestData.requesterId,
        role: 'member',
      },
    ]

    const organizationMembers = await this.queries.getOrganizationMembers(
      requestData.receiverOrganizationId
    )

    for (const orgMember of organizationMembers) {
      if (orgMember.userId !== requestData.requesterId) {
        participants.push({
          conversationId,
          userId: orgMember.userId,
          role: 'member',
        })
      }
    }

    await this.persistence.addParticipants(participants)

    await this.createSystemMessage({
      conversationId,
      content: `New request ${requestData.reqNumber} submitted by ${requester.name} to ${organizationInfo.name}`,
      senderId: requestData.requesterId,
      metadata: {
        requestId: requestData.id,
        requestNumber: requestData.reqNumber,
        eventType: 'request_submitted',
        systemEventKey: 'requests.event.submitted',
        systemEventParams: {
          requestNumber: requestData.reqNumber,
          requesterName: requester.name,
          organizationName: organizationInfo.name,
        },
      },
    })

    return conversationId
  }

  private async createSystemMessage(data: {
    conversationId: string
    content: string
    senderId: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    try {
      await this.systemMessages.createSystemMessage(data)
    } catch (error) {
      console.error('Failed to create system message:', error)
    }
  }
}
