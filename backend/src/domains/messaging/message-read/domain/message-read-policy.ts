import { MessageReadForbiddenError, MessageReadOwnMessageError } from './message-read-errors'
import type {
  MessageReadConversationAccess,
  MessageReadNotification,
  MessageReadReaderProfile,
  MessageReadStatus,
  MessageReadStatusRow,
} from './message-read-models'

export function assertCanMarkMessageAsRead(senderId: string, userId: string): void {
  if (senderId === userId) {
    throw new MessageReadOwnMessageError()
  }
}

export function assertCanAccessConversation(access: MessageReadConversationAccess): void {
  if (!access.isRequester && !access.isOrgMember) {
    throw new MessageReadForbiddenError()
  }
}

export function buildMessageReadNotification(input: {
  messageId: string
  readBy: string
  conversationId: string
  readerInfo: MessageReadReaderProfile | null
  now: Date
}): MessageReadNotification {
  return {
    type: 'message_read',
    data: {
      messageId: input.messageId,
      readBy: input.readBy,
      conversationId: input.conversationId,
      readerInfo: input.readerInfo,
    },
    timestamp: input.now.toISOString(),
  }
}

export function buildConversationReadStatuses(input: {
  rows: MessageReadStatusRow[]
  currentUserId: string
  requesterId: string | null
  isRequester: boolean
}): MessageReadStatus[] {
  const messageGroups = new Map<string, MessageReadStatusRow[]>()
  for (const row of input.rows) {
    const rows = messageGroups.get(row.messageId) ?? []
    rows.push(row)
    messageGroups.set(row.messageId, rows)
  }

  const readStatuses: MessageReadStatus[] = []

  for (const [messageId, rows] of messageGroups) {
    const messageData = rows[0]
    if (!messageData || messageData.senderId !== input.currentUserId) {
      continue
    }

    const readers = rows
      .filter((row) => {
        if (!row.readByUserId || !row.readAt) {
          return false
        }

        return input.isRequester
          ? row.readByUserId !== input.currentUserId
          : row.readByUserId === input.requesterId
      })
      .map((row) => ({
        userId: row.readByUserId!,
        userName: row.readByUserName || 'Unknown',
        userImage: row.readByUserImage || null,
        readAt: row.readAt!,
      }))

    readStatuses.push({
      messageId,
      seenStatus: readers.length > 0 ? 'seen' : 'sent',
      readBy: readers,
    })
  }

  return readStatuses
}
