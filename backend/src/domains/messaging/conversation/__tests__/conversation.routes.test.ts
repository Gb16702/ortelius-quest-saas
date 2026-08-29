import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../../infrastructure/types/api.types'
import { ConversationAccessDeniedError } from '../domain'

const messageDto = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'participant-user',
  content: 'private conversation message',
  messageType: 'text',
  replyToId: null,
  metadata: null,
  isEdited: false,
  isDeleted: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const service = {
  getUnreadConversationsCount: mock(async () => ({ count: 2, conversationIds: ['conv-1'] })),
  getUserConversations: mock(async () => ({
    conversations: [{ id: 'conv-1', name: 'General' }],
    total: 1,
  })),
  getAllConversationMessages: mock(async () => ({ messages: [messageDto], total: 1 })),
  searchConversationMessages: mock(async () => ({ messages: [], total: 0 })),
  getPinnedMessages: mock(async () => [messageDto]),
  pinConversation: mock(async () => ({ message: 'Conversation pinned successfully' })),
  unpinConversation: mock(async () => ({ message: 'Conversation unpinned successfully' })),
  getConversationParticipants: mock(async () => [{ userId: 'user-1' }]),
  resolveMemberDmConversation: mock(async () => ({
    conversationId: 'conv-member-dm',
    conversationType: 'member_dm' as const,
  })),
}

const createAuth =
  (userId = 'user-1') =>
  async (c: Context<{ Variables: CommonVariables }>, next: Next) => {
    c.set('user', {
      id: userId,
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      image: null,
      role: 'user',
    })
    await next()
  }

mock.module('../conversation.application', () => ({
  conversationApplicationService: service,
}))

mock.module('../../../../infrastructure/auth/auth.middleware', () => ({
  requireAuthMiddleware: createAuth(),
}))

const { createConversationRoutes } = await import('../presentation/conversation.routes')

function createApp(userId = 'user-1') {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/conversations', createConversationRoutes(service, createAuth(userId)))
  return app
}

describe('Conversation routes', () => {
  beforeEach(() => {
    for (const fn of Object.values(service)) {
      fn.mockClear()
    }
  })

  it('lists conversations through the application service', async () => {
    const response = await createApp().request(
      '/conversations?limit=5&offset=0&unread=true&type=member_dm&sort=oldest'
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.pagination).toEqual({ total: 1, limit: 5, offset: 0, hasMore: false })
    expect(service.getUserConversations).toHaveBeenCalledWith(
      'user-1',
      5,
      0,
      true,
      undefined,
      'member_dm',
      'oldest'
    )
  })

  it('returns unread counts through the application service', async () => {
    const response = await createApp().request('/conversations/unread-count')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data).toEqual({ count: 2, conversationIds: ['conv-1'] })
    expect(service.getUnreadConversationsCount).toHaveBeenCalledWith('user-1')
  })

  it('resolves a member DM through the application service', async () => {
    const response = await createApp('user-current').request('/conversations/resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'member_dm',
        organizationId: 'org-1',
        targetUserId: 'user-target',
      }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data).toEqual({
      conversationId: 'conv-member-dm',
      conversationType: 'member_dm',
    })
    expect(service.resolveMemberDmConversation).toHaveBeenCalledWith(
      'org-1',
      'user-current',
      'user-target'
    )
  })

  it('routes message reads, search, and pinned messages through ports', async () => {
    expect((await createApp().request('/conversations/conv-1/messages')).status).toBe(200)
    expect(
      (await createApp().request('/conversations/conv-1/messages/search?q=hello')).status
    ).toBe(200)
    expect((await createApp().request('/conversations/conv-1/messages/pinned')).status).toBe(200)

    expect(service.getAllConversationMessages).toHaveBeenCalledWith('conv-1', 'user-1')
    expect(service.searchConversationMessages).toHaveBeenCalledWith('conv-1', 'user-1', 'hello')
    expect(service.getPinnedMessages).toHaveBeenCalledWith('conv-1', 'user-1')
  })

  it('returns forbidden without message data when a non-participant reads messages', async () => {
    service.getAllConversationMessages.mockRejectedValueOnce(
      new Error('Unauthorized access to this conversation')
    )

    const response = await createApp('non-participant-user').request(
      '/conversations/conv-1/messages'
    )
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'Access denied',
    })
    expect(json).not.toHaveProperty('data')
    expect(JSON.stringify(json)).not.toContain(messageDto.content)
    expect(service.getAllConversationMessages).toHaveBeenCalledWith(
      'conv-1',
      'non-participant-user'
    )
  })

  it('returns forbidden without pinned message data for a cross-org requester', async () => {
    service.getPinnedMessages.mockRejectedValueOnce(
      new Error('Unauthorized access to this conversation')
    )

    const response = await createApp('cross-org-user').request(
      '/conversations/conv-1/messages/pinned'
    )
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'Access denied',
    })
    expect(json).not.toHaveProperty('data')
    expect(JSON.stringify(json)).not.toContain(messageDto.content)
    expect(service.getPinnedMessages).toHaveBeenCalledWith('conv-1', 'cross-org-user')
  })

  it('pins, unpins, and protects participant listing', async () => {
    expect(
      (await createApp().request('/conversations/conv-1/pin', { method: 'POST' })).status
    ).toBe(200)
    expect(
      (await createApp().request('/conversations/conv-1/pin', { method: 'DELETE' })).status
    ).toBe(200)

    let response = await createApp().request('/conversations/conv-1/participants')
    let json = await response.json()
    expect(response.status).toBe(200)
    expect(json.data.participants).toEqual([{ userId: 'user-1' }])

    service.getConversationParticipants.mockImplementationOnce(async () => {
      throw new ConversationAccessDeniedError()
    })
    response = await createApp().request('/conversations/conv-1/participants')
    json = await response.json()
    expect(response.status).toBe(403)
    expect(json).toEqual({ success: false, code: 'FORBIDDEN', message: 'Forbidden' })
  })
})
