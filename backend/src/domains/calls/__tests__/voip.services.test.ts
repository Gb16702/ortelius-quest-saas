import { beforeEach, describe, expect, it, mock } from 'bun:test'

// ---------- Mock setup ----------

type Participant = { userId: string; userName: string | null; userImage: string | null }
let conversationParticipants: Participant[] = []
let onlineUsers: Set<string> = new Set()
let userInfoByUserId: Record<string, { name: string; image: string | null }> = {}

const sentMessages: Array<{ userId: string; message: Record<string, unknown> }> = []
const systemMessages: Array<{
  conversationId: string
  senderId: string
  content: string
  metadata?: unknown
}> = []

mock.module('../../../infrastructure/messaging/websocket.service', () => ({
  sendToUser: (userId: string, message: Record<string, unknown>) => {
    sentMessages.push({ userId, message })
  },
  isUserOnline: (userId: string) => onlineUsers.has(userId),
}))

const redisClient = {
  get: mock(() => Promise.resolve(null)),
  setex: mock(() => Promise.resolve()),
}

mock.module('../../../infrastructure/cache/redis.service', () => ({
  redisService: {
    getClient: () => redisClient,
  },
  RedisChannels: {
    WS_MESSAGES: 'ws:messages',
    USER_PRESENCE: 'user:presence',
    CALL_WS_MESSAGES: 'call:ws:messages',
  },
}))

mock.module('../../../infrastructure/database', () => ({
  db: {
    select: (selectMap?: Record<string, unknown>) => {
      const isUserSelect =
        selectMap !== undefined &&
        Object.keys(selectMap).every((k) => k === 'name' || k === 'image')
      return {
        from: () => ({
          where: () => {
            if (isUserSelect) {
              const userId = Object.keys(userInfoByUserId)[0]
              return Promise.resolve(userId ? [userInfoByUserId[userId]] : [])
            }
            return Promise.resolve(conversationParticipants)
          },
          innerJoin: () => ({
            where: () => Promise.resolve(conversationParticipants),
          }),
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

mock.module('../../messaging/message/message.application', () => ({
  messageApplicationService: {
    createSystemMessage: (params: {
      conversationId: string
      senderId: string
      content: string
      metadata?: unknown
    }) => {
      systemMessages.push(params)
      return Promise.resolve()
    },
  },
}))

const callSessionMock = {
  startCall: mock(() => undefined),
  addParticipant: mock(() => true),
  endCall: mock(() => null as null | { duration: number; participants: unknown[] }),
}

mock.module('../infrastructure/call-session.store', () => ({
  callSessionService: callSessionMock,
}))

import { voipService } from '../infrastructure/voip.services'

const VALID_SDP = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 RTP/SAVPF 111`

beforeEach(() => {
  sentMessages.length = 0
  systemMessages.length = 0
  conversationParticipants = [
    { userId: 'caller', userName: 'Caller', userImage: null },
    { userId: 'callee', userName: 'Callee', userImage: null },
  ]
  onlineUsers = new Set(['caller', 'callee'])
  userInfoByUserId = {}
  callSessionMock.startCall.mockReset()
  callSessionMock.addParticipant.mockReset()
  callSessionMock.endCall.mockReset()
})

// ---------- handleCallRequest ----------

describe('VoIPService.handleCallRequest', () => {
  it('generates a callId when one is not provided', async () => {
    await voipService.handleCallRequest('caller', {
      type: 'call:request',
      conversationId: 'conv-1',
      callType: 'audio',
      fromUserId: 'caller',
    })
    const initiated = sentMessages.find((m) => m.message.type === 'call:initiated')
    expect(initiated).toBeDefined()
    expect(typeof initiated?.message.callId).toBe('string')
    expect((initiated?.message.callId as string).length).toBeGreaterThan(0)
  })

  it('uses provided callId when supplied', async () => {
    await voipService.handleCallRequest('caller', {
      type: 'call:request',
      conversationId: 'conv-1',
      callType: 'audio',
      fromUserId: 'caller',
      callId: 'fixed-call-id',
    })
    const initiated = sentMessages.find((m) => m.message.type === 'call:initiated')
    expect(initiated?.message.callId).toBe('fixed-call-id')
  })

  it('pushes voip_call_request to all online participants except sender', async () => {
    conversationParticipants = [
      { userId: 'caller', userName: 'Caller', userImage: null },
      { userId: 'callee1', userName: 'C1', userImage: null },
      { userId: 'callee2', userName: 'C2', userImage: null },
    ]
    onlineUsers = new Set(['caller', 'callee1', 'callee2'])

    await voipService.handleCallRequest('caller', {
      type: 'call:request',
      conversationId: 'conv-1',
      callType: 'audio',
      fromUserId: 'caller',
    })

    const requests = sentMessages.filter((m) => m.message.type === 'call:request')
    expect(requests.map((m) => m.userId).sort()).toEqual(['callee1', 'callee2'])
  })

  it('skips offline participants', async () => {
    conversationParticipants = [
      { userId: 'caller', userName: 'Caller', userImage: null },
      { userId: 'online-user', userName: 'On', userImage: null },
      { userId: 'offline-user', userName: 'Off', userImage: null },
    ]
    onlineUsers = new Set(['caller', 'online-user'])

    await voipService.handleCallRequest('caller', {
      type: 'call:request',
      conversationId: 'conv-1',
      callType: 'audio',
      fromUserId: 'caller',
    })

    const targets = sentMessages
      .filter((m) => m.message.type === 'call:request')
      .map((m) => m.userId)
    expect(targets).toContain('online-user')
    expect(targets).not.toContain('offline-user')
  })

  it('returns voip_no_participants when no others are online', async () => {
    onlineUsers = new Set(['caller'])

    await voipService.handleCallRequest('caller', {
      type: 'call:request',
      conversationId: 'conv-1',
      callType: 'audio',
      fromUserId: 'caller',
    })

    const noParticipants = sentMessages.find((m) => m.message.type === 'call:no_participants')
    expect(noParticipants).toBeDefined()
    expect(noParticipants?.userId).toBe('caller')
  })

  it('starts a session via callSessionService', async () => {
    await voipService.handleCallRequest('caller', {
      type: 'call:request',
      conversationId: 'conv-1',
      callType: 'audio',
      fromUserId: 'caller',
      fromUserName: 'Caller',
    })
    expect(callSessionMock.startCall).toHaveBeenCalledTimes(1)
    const args = callSessionMock.startCall.mock.calls[0]
    expect(args[1]).toBe('conv-1')
  })
})

// ---------- handleCallResponse ----------

describe('VoIPService.handleCallResponse', () => {
  it('broadcasts response to other participants when accepted', async () => {
    userInfoByUserId = { callee: { name: 'Callee', image: null } }

    await voipService.handleCallResponse('callee', {
      type: 'call:response',
      callId: 'call-1',
      conversationId: 'conv-1',
      accepted: true,
      fromUserId: 'callee',
    })

    const responses = sentMessages.filter((m) => m.message.type === 'call:response')
    expect(responses.map((m) => m.userId)).toEqual(['caller'])
    expect(responses[0].message).toMatchObject({
      callId: 'call-1',
      accepted: true,
      fromUserId: 'callee',
    })
  })

  it('broadcasts response when declined and skips participant add', async () => {
    await voipService.handleCallResponse('callee', {
      type: 'call:response',
      callId: 'call-1',
      conversationId: 'conv-1',
      accepted: false,
      fromUserId: 'callee',
    })

    expect(callSessionMock.addParticipant).not.toHaveBeenCalled()
    const responses = sentMessages.filter((m) => m.message.type === 'call:response')
    expect(responses[0].message).toMatchObject({ accepted: false })
  })

  it('adds participant via callSessionService when accepted', async () => {
    userInfoByUserId = { callee: { name: 'Callee', image: null } }

    await voipService.handleCallResponse('callee', {
      type: 'call:response',
      callId: 'call-1',
      conversationId: 'conv-1',
      accepted: true,
      fromUserId: 'callee',
    })

    expect(callSessionMock.addParticipant).toHaveBeenCalledTimes(1)
    expect(callSessionMock.addParticipant.mock.calls[0][0]).toBe('call-1')
  })

  it('rejects when missing required fields', async () => {
    await voipService.handleCallResponse('callee', {
      type: 'call:response',
      callId: '',
      conversationId: 'conv-1',
      accepted: true,
      fromUserId: 'callee',
    })

    const error = sentMessages.find((m) => m.message.type === 'error')
    expect(error?.message.message).toBe('Missing required fields')
  })
})

// ---------- handleCallEnd ----------

describe('VoIPService.handleCallEnd', () => {
  it('broadcasts call:end to all participants', async () => {
    callSessionMock.endCall.mockReturnValue({
      duration: 30,
      participants: [{}, {}],
    })
    userInfoByUserId = { caller: { name: 'Caller', image: null } }

    await voipService.handleCallEnd('caller', {
      type: 'call:end',
      callId: 'call-1',
      conversationId: 'conv-1',
    })

    const endedMessages = sentMessages.filter((m) => m.message.type === 'call:end')
    expect(endedMessages.map((m) => m.userId).sort()).toEqual(['callee', 'caller'])
  })

  it('formats duration as "few seconds" when less than 60s', async () => {
    callSessionMock.endCall.mockReturnValue({ duration: 30, participants: [] })
    userInfoByUserId = { caller: { name: 'Alice', image: null } }

    await voipService.handleCallEnd('caller', {
      type: 'call:end',
      callId: 'call-1',
      conversationId: 'conv-1',
    })

    expect(systemMessages).toHaveLength(1)
    expect(systemMessages[0].content).toBe('Alice started a call that lasted few seconds')
  })

  it('formats duration as "1 minute" when exactly 60s', async () => {
    callSessionMock.endCall.mockReturnValue({ duration: 60, participants: [] })
    userInfoByUserId = { caller: { name: 'Alice', image: null } }

    await voipService.handleCallEnd('caller', {
      type: 'call:end',
      callId: 'call-1',
      conversationId: 'conv-1',
    })

    expect(systemMessages[0].content).toBe('Alice started a call that lasted 1 minute')
  })

  it('formats duration as "N minutes" when greater than 60s', async () => {
    callSessionMock.endCall.mockReturnValue({ duration: 180, participants: [] })
    userInfoByUserId = { caller: { name: 'Alice', image: null } }

    await voipService.handleCallEnd('caller', {
      type: 'call:end',
      callId: 'call-1',
      conversationId: 'conv-1',
    })

    expect(systemMessages[0].content).toBe('Alice started a call that lasted 3 minutes')
  })

  it('includes call_summary metadata in system message', async () => {
    callSessionMock.endCall.mockReturnValue({
      duration: 45,
      participants: [{}, {}],
    })
    userInfoByUserId = { caller: { name: 'Alice', image: null } }

    await voipService.handleCallEnd('caller', {
      type: 'call:end',
      callId: 'call-1',
      conversationId: 'conv-1',
    })

    expect(systemMessages[0].metadata).toMatchObject({
      type: 'call_summary',
      callId: 'call-1',
      duration: 45,
      participantCount: 2,
    })
  })

  it('does not create system message when callInfo is null', async () => {
    callSessionMock.endCall.mockReturnValue(null)

    await voipService.handleCallEnd('caller', {
      type: 'call:end',
      callId: 'call-1',
      conversationId: 'conv-1',
    })

    expect(systemMessages).toHaveLength(0)
  })

  it('is no-op without callId or conversationId', async () => {
    await voipService.handleCallEnd('caller', {
      type: 'call:end',
      callId: '',
      conversationId: '',
    })
    expect(systemMessages).toHaveLength(0)
    expect(callSessionMock.endCall).not.toHaveBeenCalled()
  })
})

// ---------- handleSpeakerUpdate ----------

describe('VoIPService.handleSpeakerUpdate', () => {
  it('broadcasts to other participants', async () => {
    await voipService.handleSpeakerUpdate('caller', {
      type: 'call:speaker_update',
      callId: 'call-1',
      conversationId: 'conv-1',
      isSpeaking: true,
    })

    const updates = sentMessages.filter((m) => m.message.type === 'call:speaker_update')
    expect(updates.map((m) => m.userId)).toEqual(['callee'])
    expect(updates[0].message).toMatchObject({
      callId: 'call-1',
      speaker: { userId: 'caller', isSpeaking: true },
    })
  })

  it('does not echo back to sender', async () => {
    await voipService.handleSpeakerUpdate('caller', {
      type: 'call:speaker_update',
      callId: 'call-1',
      conversationId: 'conv-1',
      isSpeaking: true,
    })

    const echoed = sentMessages.find(
      (m) => m.userId === 'caller' && m.message.type === 'call:speaker_update'
    )
    expect(echoed).toBeUndefined()
  })
})

// ---------- handleMuteStatus ----------

describe('VoIPService.handleMuteStatus', () => {
  it('broadcasts mute status to other participants', async () => {
    await voipService.handleMuteStatus('caller', {
      type: 'call:mute_status',
      callId: 'call-1',
      conversationId: 'conv-1',
      isMuted: true,
    })

    const updates = sentMessages.filter((m) => m.message.type === 'call:mute_status')
    expect(updates.map((m) => m.userId)).toEqual(['callee'])
    expect(updates[0].message).toMatchObject({ isMuted: true, fromUserId: 'caller' })
  })

  it('is no-op without callId', async () => {
    await voipService.handleMuteStatus('caller', {
      type: 'call:mute_status',
      callId: '',
      conversationId: 'conv-1',
      isMuted: true,
    })
    expect(sentMessages).toHaveLength(0)
  })
})
