import type { RequestLinkingConversationPort } from '../application/ports'
import type { Request } from '../application/request-models'
import type {
  RequestConversationParticipant,
  RequestConversationPersistenceAdapterPort,
  RequestConversationQueryAdapterPort,
} from './request-conversation.types'
import type { RequestSystemMessageAdapterPort } from './request-system-message.types'

export class RequestLinkingConversationAdapter implements RequestLinkingConversationPort {
  constructor(
    private readonly queries: RequestConversationQueryAdapterPort,
    private readonly persistence: RequestConversationPersistenceAdapterPort,
    private readonly systemMessages: RequestSystemMessageAdapterPort
  ) {}

  async resolveLinkedRequestConversation(data: {
    request: Request
    userEmail: string
    userId: string
  }): Promise<string | null> {
    const userName = await this.queries.resolveUserName(data.userId, data.userEmail.split('@')[0])
    const anonymousUser = await this.queries.getAnonymousUserByEmail(data.userEmail)
    const existingAuthConversation = await this.queries.findConversationByRequester(
      data.userId,
      data.request.receiverOrganizationId
    )

    if (data.request.conversationId) {
      return await this.resolveExistingRequestConversation({
        request: data.request,
        userId: data.userId,
        userName,
        anonymousUserId: anonymousUser?.id,
        existingAuthConversation,
      })
    }

    if (existingAuthConversation) {
      await this.createSystemMessage({
        conversationId: existingAuthConversation,
        content: `Request ${data.request.reqNumber} linked to ${userName}'s account`,
        senderId: data.userId,
        metadata: {
          systemEventKey: 'requests.event.linkedToAccount',
          systemEventParams: {
            requestNumber: data.request.reqNumber,
            userName,
          },
        },
      })
      return existingAuthConversation
    }

    return await this.createRequestConversation({
      id: data.request.id,
      reqNumber: data.request.reqNumber,
      requesterId: data.userId,
      receiverOrganizationId: data.request.receiverOrganizationId,
    })
  }

  private async resolveExistingRequestConversation(data: {
    request: Request
    userId: string
    userName: string
    anonymousUserId?: string
    existingAuthConversation: string | null
  }): Promise<string | null> {
    const requestConversationId = data.request.conversationId
    if (!requestConversationId) return null

    const existingConversation = await this.queries.getConversation(requestConversationId)

    if (existingConversation?.anonymousRequesterId !== data.anonymousUserId) {
      return requestConversationId
    }

    if (data.existingAuthConversation) {
      await this.persistence.deleteConversation(requestConversationId)
      await this.createSystemMessage({
        conversationId: data.existingAuthConversation,
        content: `${data.userName} has created an account and their requests have been linked`,
        senderId: data.userId,
        metadata: {
          systemEventKey: 'requests.event.accountCreatedAndLinked',
          systemEventParams: {
            userName: data.userName,
          },
        },
      })
      return data.existingAuthConversation
    }

    await this.persistence.updateConversationRequester(requestConversationId, data.userId)
    await this.persistence.ensureParticipant(requestConversationId, data.userId)
    await this.createSystemMessage({
      conversationId: requestConversationId,
      content: `${data.userName} has created an account`,
      senderId: data.userId,
      metadata: {
        systemEventKey: 'requests.event.accountCreated',
        systemEventParams: {
          userName: data.userName,
        },
      },
    })

    return requestConversationId
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
