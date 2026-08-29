import { describe, expect, it, mock } from 'bun:test'
import {
  GetConversationReadStatusesUseCase,
  MarkConversationAsReadUseCase,
  MarkMessageAsReadUseCase,
} from '../application/message-read-use-cases'
import type {
  MessageReadClockPort,
  MessageReadNotificationPort,
  MessageReadRepositoryPort,
} from '../application/ports'
import { MessageReadConversationNotFoundError, MessageReadOwnMessageError } from '../domain'

function makeRepository(
  overrides: Partial<MessageReadRepositoryPort> = {}
): MessageReadRepositoryPort {
  return {
    getMessage: mock(async () => ({
      id: 'msg-1',
      senderId: 'sender-1',
      conversationId: 'conv-1',
    })),
    getConversationAccess: mock(async () => ({
      organizationId: 'org-1',
      requesterId: 'requester-1',
      isRequester: false,
      isOrgMember: true,
    })),
    hasMessageRead: mock(async () => false),
    insertMessageRead: mock(async () => {}),
    insertMessageReads: mock(async () => {}),
    getUnreadMessagesForConversation: mock(async () => [{ id: 'msg-1' }, { id: 'msg-2' }]),
    getMessagesByIds: mock(async () => [
      { id: 'msg-1', senderId: 'sender-1', conversationId: 'conv-1' },
      { id: 'msg-2', senderId: 'sender-2', conversationId: 'conv-1' },
    ]),
    getReaderInfo: mock(async () => ({ userId: 'reader-1', userName: 'Reader', userImage: null })),
    getConversationReadStatusRows: mock(async () => [
      {
        messageId: 'msg-1',
        senderId: 'reader-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        readAt: new Date('2026-01-01T00:01:00.000Z'),
        readByUserId: 'requester-1',
        readByUserName: 'Requester',
        readByUserImage: null,
      },
    ]),
    ...overrides,
  }
}

function makeNotifications(): MessageReadNotificationPort {
  return {
    sendToUser: mock(() => {}),
  }
}

const clock: MessageReadClockPort = {
  now: () => new Date('2026-01-01T00:00:00.000Z'),
}

describe('Message read use cases', () => {
  it('marks a message as read and emits a websocket notification', async () => {
    const repository = makeRepository()
    const notifications = makeNotifications()
    const useCase = new MarkMessageAsReadUseCase(repository, notifications, clock)

    const result = await useCase.execute({ messageId: 'msg-1', userId: 'reader-1' })

    expect(result).toEqual({ success: true })
    expect(repository.insertMessageRead).toHaveBeenCalledWith('msg-1', 'reader-1')
    expect(notifications.sendToUser).toHaveBeenCalledWith('sender-1', {
      type: 'message_read',
      data: {
        messageId: 'msg-1',
        readBy: 'reader-1',
        conversationId: 'conv-1',
        readerInfo: { userId: 'reader-1', userName: 'Reader', userImage: null },
      },
      timestamp: '2026-01-01T00:00:00.000Z',
    })
  })

  it('does not duplicate reads or notifications', async () => {
    const repository = makeRepository({ hasMessageRead: mock(async () => true) })
    const notifications = makeNotifications()
    const useCase = new MarkMessageAsReadUseCase(repository, notifications, clock)

    await useCase.execute({ messageId: 'msg-1', userId: 'reader-1' })

    expect(repository.insertMessageRead).not.toHaveBeenCalled()
    expect(notifications.sendToUser).not.toHaveBeenCalled()
  })

  it('rejects marking your own message as read', async () => {
    const repository = makeRepository({
      getMessage: mock(async () => ({
        id: 'msg-1',
        senderId: 'reader-1',
        conversationId: 'conv-1',
      })),
    })
    const useCase = new MarkMessageAsReadUseCase(repository, makeNotifications(), clock)

    await expect(useCase.execute({ messageId: 'msg-1', userId: 'reader-1' })).rejects.toThrow(
      MessageReadOwnMessageError
    )
  })

  it('marks all unread conversation messages and notifies senders', async () => {
    const repository = makeRepository()
    const notifications = makeNotifications()
    const useCase = new MarkConversationAsReadUseCase(repository, notifications, clock)

    const result = await useCase.execute({ conversationId: 'conv-1', userId: 'reader-1' })

    expect(result).toEqual({ success: true, markedCount: 2 })
    expect(repository.insertMessageReads).toHaveBeenCalledWith([
      { messageId: 'msg-1', userId: 'reader-1' },
      { messageId: 'msg-2', userId: 'reader-1' },
    ])
    expect(notifications.sendToUser).toHaveBeenCalledTimes(2)
  })

  it('returns typed not found when conversation access cannot be loaded', async () => {
    const repository = makeRepository({ getConversationAccess: mock(async () => null) })
    const useCase = new MarkConversationAsReadUseCase(repository, makeNotifications(), clock)

    await expect(useCase.execute({ conversationId: 'conv-1', userId: 'reader-1' })).rejects.toThrow(
      MessageReadConversationNotFoundError
    )
  })

  it('returns read statuses from pure grouping policy', async () => {
    const repository = makeRepository()
    const result = await new GetConversationReadStatusesUseCase(repository).execute({
      conversationId: 'conv-1',
      currentUserId: 'reader-1',
    })

    expect(result.readStatuses).toEqual([
      {
        messageId: 'msg-1',
        seenStatus: 'seen',
        readBy: [
          {
            userId: 'requester-1',
            userName: 'Requester',
            userImage: null,
            readAt: new Date('2026-01-01T00:01:00.000Z'),
          },
        ],
      },
    ])
  })
})
