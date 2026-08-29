import { describe, expect, it } from 'bun:test'
import {
  assertCanAccessConversation,
  assertCanMarkMessageAsRead,
  buildConversationReadStatuses,
  buildMessageReadNotification,
  MessageReadForbiddenError,
  MessageReadOwnMessageError,
} from '../domain'

describe('Message read domain policy', () => {
  it('rejects marking your own message as read', () => {
    expect(() => assertCanMarkMessageAsRead('user-1', 'user-1')).toThrow(MessageReadOwnMessageError)
    expect(() => assertCanMarkMessageAsRead('user-2', 'user-1')).not.toThrow()
  })

  it('authorizes requester or organization member access', () => {
    expect(() =>
      assertCanAccessConversation({
        organizationId: 'org-1',
        requesterId: 'requester-1',
        isRequester: false,
        isOrgMember: false,
      })
    ).toThrow(MessageReadForbiddenError)

    expect(() =>
      assertCanAccessConversation({
        organizationId: 'org-1',
        requesterId: 'requester-1',
        isRequester: false,
        isOrgMember: true,
      })
    ).not.toThrow()
  })

  it('builds read notifications without infrastructure dependencies', () => {
    expect(
      buildMessageReadNotification({
        messageId: 'msg-1',
        readBy: 'reader-1',
        conversationId: 'conv-1',
        readerInfo: { userId: 'reader-1', userName: 'Ada', userImage: null },
        now: new Date('2026-01-01T00:00:00.000Z'),
      })
    ).toEqual({
      type: 'message_read',
      data: {
        messageId: 'msg-1',
        readBy: 'reader-1',
        conversationId: 'conv-1',
        readerInfo: { userId: 'reader-1', userName: 'Ada', userImage: null },
      },
      timestamp: '2026-01-01T00:00:00.000Z',
    })
  })

  it('builds seen statuses for messages sent by the current user', () => {
    const readStatuses = buildConversationReadStatuses({
      currentUserId: 'sender-1',
      requesterId: 'requester-1',
      isRequester: false,
      rows: [
        {
          messageId: 'msg-1',
          senderId: 'sender-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          readAt: new Date('2026-01-01T00:01:00.000Z'),
          readByUserId: 'requester-1',
          readByUserName: 'Requester',
          readByUserImage: null,
        },
        {
          messageId: 'msg-2',
          senderId: 'other-user',
          createdAt: new Date('2026-01-01T00:02:00.000Z'),
          readAt: new Date('2026-01-01T00:03:00.000Z'),
          readByUserId: 'sender-1',
          readByUserName: 'Sender',
          readByUserImage: null,
        },
      ],
    })

    expect(readStatuses).toEqual([
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
