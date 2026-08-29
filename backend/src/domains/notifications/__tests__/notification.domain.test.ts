import { describe, expect, it } from 'bun:test'
import {
  buildMessageNotificationPayload,
  buildRequestUpdateNotificationPayload,
  buildSystemNotificationPayload,
  getRequestNotificationTitle,
} from '../domain'

const now = new Date('2026-05-01T12:00:00.000Z')

describe('Notification domain', () => {
  it('builds message notification payloads without infrastructure', () => {
    const payload = buildMessageNotificationPayload(
      'user-123',
      {
        conversationId: 'conversation-1',
        messageId: 'message-1',
        senderId: 'sender-1',
        senderName: 'Alice',
        senderImage: null,
        content: 'Hello',
        conversationName: 'Team',
        metadata: { requestId: 'request-1' },
      },
      now
    )

    expect(payload).toEqual({
      type: 'message',
      title: 'Alice',
      message: 'Hello',
      data: {
        conversationId: 'conversation-1',
        messageId: 'message-1',
        senderId: 'sender-1',
        senderName: 'Alice',
        senderImage: null,
        conversationName: 'Team',
        metadata: { requestId: 'request-1' },
      },
      timestamp: now.toISOString(),
      userId: 'user-123',
    })
  })

  it('maps request actions to route-compatible titles', () => {
    expect(
      getRequestNotificationTitle({ requestId: 'r', lifecycleStatus: 'open', details: 'd' })
    ).toBe('New Request')
    expect(
      getRequestNotificationTitle({
        requestId: 'r',
        lifecycleStatus: 'open',
        details: 'd',
        action: 'request_assigned',
      })
    ).toBe('Request Assigned to You')
    expect(
      getRequestNotificationTitle({ requestId: 'r', lifecycleStatus: 'unknown', details: 'd' })
    ).toBe('Request Status Change')
  })

  it('builds request update and system payloads', () => {
    const requestPayload = buildRequestUpdateNotificationPayload(
      'user-123',
      {
        requestId: 'request-1',
        lifecycleStatus: 'open',
        details: 'Assigned to you',
        organizationName: 'ACME',
        requestNumber: 'REQ-1',
        action: 'request_assigned',
      },
      now
    )
    const systemPayload = buildSystemNotificationPayload(
      'user-123',
      {
        title: 'System Update',
        message: 'Please review',
        action: { label: 'Open', url: '/dashboard' },
      },
      now
    )

    expect(requestPayload).toMatchObject({
      type: 'request_update',
      title: 'Request Assigned to You',
      message: 'Assigned to you',
      userId: 'user-123',
    })
    expect(systemPayload).toEqual({
      type: 'system',
      title: 'System Update',
      message: 'Please review',
      data: {
        severity: 'info',
        action: { label: 'Open', url: '/dashboard' },
      },
      timestamp: now.toISOString(),
      userId: 'user-123',
    })
  })
})
