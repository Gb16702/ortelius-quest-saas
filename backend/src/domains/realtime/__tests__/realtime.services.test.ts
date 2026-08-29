import { beforeEach, describe, expect, it, mock } from 'bun:test'

// ---------- Mock state ----------

type Participant = { userId: string }
let conversationParticipants: Participant[] = []
let userRow: { name: string; image: string | null } | null = null
let presenceSubscriberOrganizations: Array<{ organizationId: string }> = []
let presenceVisibleUsers: Array<{ userId: string }> = []

const sentMessages: Array<{ userId: string; message: Record<string, unknown> }> = []
const presenceSubscribed: Array<{ subscriberId: string; targets: string[] }> = []
const presenceUnsubscribed: Array<{ subscriberId: string; targets: string[] }> = []
let presenceCleanupCalls: string[] = []

const activeConversations = new Map<string, string | null>()
const connectedUsers = new Map<string, unknown>()

const messageRateLimit = { allowed: true, retryAfter: 0 }
const broadcastRateLimit = { allowed: true, retryAfter: 0 }

// ---------- Mocks ----------

mock.module('../../../infrastructure/messaging/websocket.service', () => ({
  sendToUser: (userId: string, message: Record<string, unknown>) => {
    sentMessages.push({ userId, message })
    return true
  },
  addUser: () => Promise.resolve(),
  activeConversations,
  connectedUsers,
  cleanupUserPresenceSubscriptions: (userId: string) => {
    presenceCleanupCalls.push(userId)
  },
  handleSubscribePresence: async (subscriberId: string, targets: string[]) => {
    presenceSubscribed.push({ subscriberId, targets })
  },
  handleUnsubscribePresence: (subscriberId: string, targets: string[]) => {
    presenceUnsubscribed.push({ subscriberId, targets })
  },
}))

mock.module('../../../infrastructure/database', () => ({
  db: {
    select: (selectMap?: Record<string, unknown>) => {
      const isUserSelect =
        selectMap !== undefined &&
        Object.keys(selectMap).every((k) => k === 'name' || k === 'image')
      const isPresenceSubscriberOrganizationSelect =
        selectMap !== undefined && Object.keys(selectMap).every((k) => k === 'organizationId')
      const isPresenceVisibleUserSelect =
        selectMap !== undefined && Object.keys(selectMap).every((k) => k === 'userId')
      return {
        from: () => ({
          where: () =>
            isUserSelect
              ? Promise.resolve(userRow ? [userRow] : [])
              : isPresenceSubscriberOrganizationSelect
                ? Promise.resolve(presenceSubscriberOrganizations)
                : isPresenceVisibleUserSelect
                  ? Promise.resolve(presenceVisibleUsers)
                  : Promise.resolve(conversationParticipants),
        }),
      }
    },
  },
}))

mock.module('../../../infrastructure/database/db/schemas/auth-schema', () => ({
  user: {},
}))
mock.module('../../../infrastructure/database/db/schemas/chat-schema', () => ({
  conversationParticipant: {},
}))

mock.module('../../../infrastructure/monitoring/rate-limiter.service', () => ({
  messageRateLimiter: { checkLimit: () => Promise.resolve(messageRateLimit) },
  broadcastRateLimiter: { checkLimit: () => Promise.resolve(broadcastRateLimit) },
  connectionThrottler: {
    addConnection: () => true,
    removeConnection: () => undefined,
  },
}))

mock.module('../../calls/infrastructure/voip.services', () => ({
  voipService: {
    handleCallRequest: mock(() => Promise.resolve()),
    handleCallResponse: mock(() => Promise.resolve()),
    handleCallEnd: mock(() => Promise.resolve()),
    handleSpeakerUpdate: mock(() => Promise.resolve()),
    handleMuteStatus: mock(() => Promise.resolve()),
  },
}))

const notifSubscribe = mock(() => undefined)
const notifUnsubscribe = mock(() => undefined)
mock.module('../../notifications/notifications.application', () => ({
  notificationApplicationService: {
    subscriptions: {
      subscribe: notifSubscribe,
      unsubscribe: notifUnsubscribe,
    },
  },
}))

import { realtimeService } from '../infrastructure/realtime.service'

beforeEach(() => {
  sentMessages.length = 0
  presenceSubscribed.length = 0
  presenceUnsubscribed.length = 0
  presenceCleanupCalls = []
  activeConversations.clear()
  connectedUsers.clear()
  messageRateLimit.allowed = true
  broadcastRateLimit.allowed = true
  conversationParticipants = []
  userRow = null
  presenceSubscriberOrganizations = [{ organizationId: 'org-1' }]
  presenceVisibleUsers = [{ userId: 'bob' }, { userId: 'carol' }]
  notifSubscribe.mockClear()
  notifUnsubscribe.mockClear()
})

// ---------- chat:typing ----------

describe('handleMessage > chat:typing', () => {
  it('rejects typing from a non-participant (security)', async () => {
    // Sender 'stranger' is not in the conversation.
    conversationParticipants = [{ userId: 'alice' }, { userId: 'bob' }]
    userRow = { name: 'Stranger', image: null }

    await realtimeService.handleMessage('stranger', {
      type: 'chat:typing',
      conversationId: 'conv-1',
      isTyping: true,
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)

    const typingMessages = sentMessages.filter((m) => m.message.type === 'chat:typing')
    expect(typingMessages).toHaveLength(0)
  })

  it('broadcasts typing to other participants when sender is a member', async () => {
    conversationParticipants = [{ userId: 'alice' }, { userId: 'bob' }, { userId: 'carol' }]
    userRow = { name: 'Alice', image: null }

    await realtimeService.handleMessage('alice', {
      type: 'chat:typing',
      conversationId: 'conv-1',
      isTyping: true,
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)

    const typingMessages = sentMessages.filter((m) => m.message.type === 'chat:typing')
    expect(typingMessages.map((m) => m.userId).sort()).toEqual(['bob', 'carol'])
    expect(typingMessages[0].message).toMatchObject({
      conversationId: 'conv-1',
      isTyping: true,
      userId: 'alice',
      userName: 'Alice',
    })
  })

  it('does nothing if conversationId is missing', async () => {
    await realtimeService.handleMessage('alice', {
      type: 'chat:typing',
      isTyping: true,
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)
    expect(sentMessages).toHaveLength(0)
  })
})

// ---------- message:new (dropped) ----------

describe('handleMessage > message:new', () => {
  it('returns unknown_message_type — clients must NOT push message:new (spoofing)', async () => {
    conversationParticipants = [{ userId: 'alice' }, { userId: 'bob' }]

    await realtimeService.handleMessage('alice', {
      type: 'message:new',
      conversationId: 'conv-1',
      data: { id: 'fake', content: 'spoofed', senderId: 'someone-else' },
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)

    // Server should respond with an error to the sender, NOT broadcast.
    const errors = sentMessages.filter((m) => m.message.type === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatchObject({ code: 'unknown_message_type' })
    expect(errors[0].userId).toBe('alice')

    const broadcasts = sentMessages.filter((m) => m.message.type === 'message:new')
    expect(broadcasts).toHaveLength(0)
  })
})

// ---------- presence:subscribe / presence:unsubscribe ----------

describe('handleMessage > presence subscribe/unsubscribe', () => {
  it('routes presence:subscribe to handleSubscribePresence', async () => {
    await realtimeService.handleMessage('alice', {
      type: 'presence:subscribe',
      userIds: ['bob', 'carol'],
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)
    expect(presenceSubscribed).toEqual([{ subscriberId: 'alice', targets: ['bob', 'carol'] }])
  })

  it('filters presence:subscribe targets outside the subscriber organizations', async () => {
    presenceVisibleUsers = [{ userId: 'bob' }]

    await realtimeService.handleMessage('alice', {
      type: 'presence:subscribe',
      userIds: ['bob', 'requester-1'],
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)

    expect(presenceSubscribed).toEqual([{ subscriberId: 'alice', targets: ['bob'] }])
  })

  it('drops presence:subscribe targets when the subscriber is not an organization member', async () => {
    presenceSubscriberOrganizations = []

    await realtimeService.handleMessage('requester-1', {
      type: 'presence:subscribe',
      userIds: ['alice'],
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)

    expect(presenceSubscribed).toEqual([{ subscriberId: 'requester-1', targets: [] }])
  })

  it('routes presence:unsubscribe to handleUnsubscribePresence', async () => {
    await realtimeService.handleMessage('alice', {
      type: 'presence:unsubscribe',
      userIds: ['bob'],
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)
    expect(presenceUnsubscribed).toEqual([{ subscriberId: 'alice', targets: ['bob'] }])
  })
})

// ---------- Rate limiting ----------

describe('handleMessage > rate limiting', () => {
  it('returns rate_limit_exceeded code when message limit hit', async () => {
    messageRateLimit.allowed = false
    messageRateLimit.retryAfter = 5

    await realtimeService.handleMessage('alice', {
      type: 'chat:typing',
      conversationId: 'conv-1',
      isTyping: true,
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)

    const errors = sentMessages.filter((m) => m.message.type === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatchObject({ code: 'rate_limit_exceeded' })
  })

  it('returns broadcast_rate_limit_exceeded code on broadcast types', async () => {
    broadcastRateLimit.allowed = false

    await realtimeService.handleMessage('alice', {
      type: 'chat:typing',
      conversationId: 'conv-1',
      isTyping: true,
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)

    const errors = sentMessages.filter((m) => m.message.type === 'error')
    expect(errors[0].message).toMatchObject({ code: 'broadcast_rate_limit_exceeded' })
  })
})

// ---------- conversation:set_active ----------

describe('handleMessage > conversation:set_active', () => {
  it('updates the activeConversations map', async () => {
    await realtimeService.handleMessage('alice', {
      type: 'conversation:set_active',
      conversationId: 'conv-1',
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)
    expect(activeConversations.get('alice')).toBe('conv-1')
  })

  it('clears active conversation on null', async () => {
    activeConversations.set('alice', 'conv-1')
    await realtimeService.handleMessage('alice', {
      type: 'conversation:set_active',
      conversationId: null,
      timestamp: '2026-05-06T00:00:00.000Z',
    } as never)
    expect(activeConversations.get('alice')).toBe(null)
  })
})

// ---------- handleConnection auto-subscribe ----------

describe('handleConnection', () => {
  it('auto-subscribes the user to notifications at connect', async () => {
    const ws = { readyState: 1, onopen: null } as unknown as WebSocket
    await realtimeService.handleConnection('alice', ws)
    expect(notifSubscribe).toHaveBeenCalledWith('alice')
  })
})

// ---------- handleDisconnection cleanup ----------

describe('handleDisconnection', () => {
  it('runs user-level cleanup only when no other tabs remain', () => {
    // Pretend another tab is still connected.
    connectedUsers.set('alice', {})
    realtimeService.handleDisconnection('alice')
    expect(notifUnsubscribe).not.toHaveBeenCalled()
    expect(presenceCleanupCalls).toEqual([])
  })

  it('cleans notifications + presence subs + active conversation when last tab closes', () => {
    activeConversations.set('alice', 'conv-1')
    // connectedUsers does NOT have alice → considered last tab gone.
    realtimeService.handleDisconnection('alice')
    expect(notifUnsubscribe).toHaveBeenCalledWith('alice')
    expect(presenceCleanupCalls).toEqual(['alice'])
    expect(activeConversations.has('alice')).toBe(false)
  })
})
