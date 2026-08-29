import {
  assertCanAccessConversation,
  assertCanMarkMessageAsRead,
  buildConversationReadStatuses,
  buildMessageReadNotification,
  MessageReadConversationNotFoundError,
  MessageReadMessageNotFoundError,
} from '../domain'
import type { ConversationReadStatusResponse } from './message-read-models'
import type {
  MessageReadClockPort,
  MessageReadNotificationPort,
  MessageReadRepositoryPort,
} from './ports'

export class MarkMessageAsReadUseCase {
  constructor(
    private readonly repository: MessageReadRepositoryPort,
    private readonly notifications: MessageReadNotificationPort,
    private readonly clock: MessageReadClockPort
  ) {}

  async execute(command: { messageId: string; userId: string }): Promise<{ success: boolean }> {
    const message = await this.repository.getMessage(command.messageId)
    if (!message) {
      throw new MessageReadMessageNotFoundError()
    }

    assertCanMarkMessageAsRead(message.senderId, command.userId)

    const access = await this.repository.getConversationAccess(
      message.conversationId,
      command.userId
    )
    if (!access) {
      throw new MessageReadConversationNotFoundError()
    }
    assertCanAccessConversation(access)

    const alreadyRead = await this.repository.hasMessageRead(command.messageId, command.userId)
    if (!alreadyRead) {
      await this.repository.insertMessageRead(command.messageId, command.userId)
      const readerInfo = await this.repository.getReaderInfo(command.userId)

      this.notifications.sendToUser(
        message.senderId,
        buildMessageReadNotification({
          messageId: command.messageId,
          readBy: command.userId,
          conversationId: message.conversationId,
          readerInfo,
          now: this.clock.now(),
        })
      )
    }

    return { success: true }
  }
}

export class MarkConversationAsReadUseCase {
  constructor(
    private readonly repository: MessageReadRepositoryPort,
    private readonly notifications: MessageReadNotificationPort,
    private readonly clock: MessageReadClockPort
  ) {}

  async execute(command: {
    conversationId: string
    userId: string
  }): Promise<{ success: boolean; markedCount: number }> {
    const access = await this.repository.getConversationAccess(
      command.conversationId,
      command.userId
    )
    if (!access) {
      throw new MessageReadConversationNotFoundError()
    }
    assertCanAccessConversation(access)

    const unreadMessages = await this.repository.getUnreadMessagesForConversation(
      command.conversationId,
      command.userId
    )

    if (unreadMessages.length > 0) {
      await this.repository.insertMessageReads(
        unreadMessages.map((message) => ({
          messageId: message.id,
          userId: command.userId,
        }))
      )

      const readerInfo = await this.repository.getReaderInfo(command.userId)
      const messageDetails = await this.repository.getMessagesByIds(
        unreadMessages.map((message) => message.id)
      )

      for (const message of messageDetails) {
        this.notifications.sendToUser(
          message.senderId,
          buildMessageReadNotification({
            messageId: message.id,
            readBy: command.userId,
            conversationId: message.conversationId,
            readerInfo,
            now: this.clock.now(),
          })
        )
      }
    }

    return { success: true, markedCount: unreadMessages.length }
  }
}

export class GetConversationReadStatusesUseCase {
  constructor(private readonly repository: MessageReadRepositoryPort) {}

  async execute(command: {
    conversationId: string
    currentUserId: string
  }): Promise<ConversationReadStatusResponse> {
    const access = await this.repository.getConversationAccess(
      command.conversationId,
      command.currentUserId
    )
    if (!access) {
      throw new MessageReadConversationNotFoundError()
    }
    assertCanAccessConversation(access)

    const rows = await this.repository.getConversationReadStatusRows(command.conversationId)

    return {
      readStatuses: buildConversationReadStatuses({
        rows,
        currentUserId: command.currentUserId,
        requesterId: access.requesterId,
        isRequester: access.isRequester,
      }),
    }
  }
}
