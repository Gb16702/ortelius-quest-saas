import { beforeEach, describe, expect, it, mock } from 'bun:test'

// ---------- Mock setup (must run before importing the SUT) ----------

type Participant = { userId: string; userName: string | null; userImage: string | null }

let currentParticipants: Participant[] = []

const redisClient = {
  get: mock(() => Promise.resolve(null as string | null)),
  setex: mock(() => Promise.resolve('OK')),
  del: mock(() => Promise.resolve(1)),
}

const redisServiceMock = {
  getClient: mock(() => redisClient),
}

mock.module('../../../infrastructure/cache/redis.service', () => ({
  redisService: redisServiceMock,
  RedisChannels: {
    WS_MESSAGES: 'ws:messages',
    USER_PRESENCE: 'user:presence',
    CALL_WS_MESSAGES: 'call:ws:messages',
  },
}))

// db.select().from(...).innerJoin(...).where(...) → returns Promise<participants[]>
function makeDbSelectChain() {
  const chain: Record<string, unknown> = {}
  chain.from = mock(() => chain)
  chain.innerJoin = mock(() => chain)
  chain.where = mock(() => Promise.resolve(currentParticipants))
  return chain
}

const dbMock = {
  select: mock(() => makeDbSelectChain()),
}

mock.module('../../../infrastructure/database', () => ({
  db: dbMock,
}))

mock.module('../../../infrastructure/database/db/schemas/auth-schema', () => ({
  user: {},
}))
mock.module('../../../infrastructure/database/db/schemas/chat-schema', () => ({
  conversationParticipant: {},
}))

// Capture sendToUser calls + isUserOnline behaviour.
const sendToUserMock = mock(
  (_userId: string, _msg: Record<string, unknown>) => undefined as unknown as void
)
const isUserOnlineMock = mock((_userId: string) => true)

mock.module('../../../infrastructure/messaging/websocket.service', () => ({
  sendToUser: sendToUserMock,
  isUserOnline: isUserOnlineMock,
}))

// Stub downstream services that voip.services imports (only handleCallEnd uses them).
mock.module('../messaging/message/message.application', () => ({
  messageApplicationService: {
    createSystemMessage: mock(() => Promise.resolve()),
  },
}))
mock.module('../infrastructure/call-session.store', () => ({
  callSessionService: {
    startCall: mock(() => undefined),
    addParticipant: mock(() => undefined),
    endCall: mock(() => null),
  },
}))

// ---------- Import SUT after mocks ----------
import { VoIPService } from '../infrastructure/voip.services'

// ---------- Helpers ----------
const VALID_SDP = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'

function makeOffer(sdp: string) {
  return { type: 'offer', sdp } as RTCSessionDescriptionInit
}

function makeAnswer(sdp: string) {
  return { type: 'answer', sdp } as RTCSessionDescriptionInit
}

function makeOfferMsg(opts: {
  sdp?: string
  offer?: unknown
  conversationId?: string
  targetUserId?: string
  callId?: string
}) {
  return {
    type: 'voip:offer' as const,
    conversationId: opts.conversationId ?? 'conv-1',
    callId: opts.callId ?? 'call-1',
    offer:
      opts.offer !== undefined
        ? (opts.offer as RTCSessionDescriptionInit)
        : makeOffer(opts.sdp ?? VALID_SDP),
    fromUserId: 'A',
    timestamp: new Date().toISOString(),
    ...(opts.targetUserId ? { targetUserId: opts.targetUserId } : {}),
  } as Parameters<VoIPService['handleOffer']>[1]
}

function makeAnswerMsg(opts: { sdp?: string; conversationId?: string; targetUserId?: string }) {
  return {
    type: 'voip:answer' as const,
    conversationId: opts.conversationId ?? 'conv-1',
    callId: 'call-1',
    answer: makeAnswer(opts.sdp ?? VALID_SDP),
    fromUserId: 'A',
    timestamp: new Date().toISOString(),
    ...(opts.targetUserId ? { targetUserId: opts.targetUserId } : {}),
  } as Parameters<VoIPService['handleAnswer']>[1]
}

function makeIceMsg(opts: { candidate: string; conversationId?: string; targetUserId?: string }) {
  return {
    type: 'voip:ice_candidate' as const,
    conversationId: opts.conversationId ?? 'conv-1',
    callId: 'call-1',
    candidate: { candidate: opts.candidate, sdpMid: '0', sdpMLineIndex: 0 } as RTCIceCandidateInit,
    fromUserId: 'A',
    timestamp: new Date().toISOString(),
    ...(opts.targetUserId ? { targetUserId: opts.targetUserId } : {}),
  } as Parameters<VoIPService['handleIceCandidate']>[1]
}

function resetMocks() {
  redisClient.get.mockReset()
  redisClient.get.mockImplementation(() => Promise.resolve(null))
  redisClient.setex.mockReset()
  redisClient.setex.mockImplementation(() => Promise.resolve('OK'))
  dbMock.select.mockReset()
  dbMock.select.mockImplementation(() => makeDbSelectChain())
  sendToUserMock.mockReset()
  sendToUserMock.mockImplementation(() => undefined)
  isUserOnlineMock.mockReset()
  isUserOnlineMock.mockImplementation(() => true)
  // Default: A and B are participants of conv-1.
  currentParticipants = [
    { userId: 'A', userName: 'Alice', userImage: null },
    { userId: 'B', userName: 'Bob', userImage: null },
  ]
}

function errorsTo(userId: string): Array<Record<string, unknown>> {
  return sendToUserMock.mock.calls
    .filter((c) => c[0] === userId)
    .map((c) => c[1] as Record<string, unknown>)
    .filter((m) => m.type === 'error')
}

function relayedTo(userId: string): Array<Record<string, unknown>> {
  return sendToUserMock.mock.calls
    .filter((c) => c[0] === userId)
    .map((c) => c[1] as Record<string, unknown>)
}

// ---------- Tests ----------

describe('VoIPService > SDP injection prevention (handleOffer)', () => {
  let svc: VoIPService
  beforeEach(() => {
    resetMocks()
    svc = new VoIPService()
  })

  it('rejects offer with <script> tag in sdp', async () => {
    const malicious = `${VALID_SDP}<script>alert(1)</script>`
    await svc.handleOffer('A', makeOfferMsg({ sdp: malicious }))
    const errs = errorsTo('A')
    expect(errs.length).toBe(1)
    expect(errs[0]!.message).toBe('Invalid offer format')
  })

  it('rejects offer containing javascript: scheme', async () => {
    const malicious = `${VALID_SDP}a=javascript:foo()`
    await svc.handleOffer('A', makeOfferMsg({ sdp: malicious }))
    expect(errorsTo('A').length).toBe(1)
    expect(errorsTo('A')[0]!.message).toBe('Invalid offer format')
  })

  it('rejects offer containing eval(', async () => {
    const malicious = `${VALID_SDP}a=eval(bad)`
    await svc.handleOffer('A', makeOfferMsg({ sdp: malicious }))
    expect(errorsTo('A').length).toBe(1)
  })

  it('rejects offer containing onerror=', async () => {
    const malicious = `${VALID_SDP}a=onerror=hack`
    await svc.handleOffer('A', makeOfferMsg({ sdp: malicious }))
    expect(errorsTo('A').length).toBe(1)
  })

  it('rejects offer containing onclick=', async () => {
    const malicious = `${VALID_SDP}a=onclick=hack`
    await svc.handleOffer('A', makeOfferMsg({ sdp: malicious }))
    expect(errorsTo('A').length).toBe(1)
  })
})

describe('VoIPService > SDP malformed structure', () => {
  let svc: VoIPService
  beforeEach(() => {
    resetMocks()
    svc = new VoIPService()
  })

  it('rejects offer missing v=', async () => {
    const sdp = 'o=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\n'
    await svc.handleOffer('A', makeOfferMsg({ sdp }))
    expect(errorsTo('A').length).toBe(1)
    expect(errorsTo('A')[0]!.message).toBe('Invalid offer format')
  })

  it('rejects offer missing o=', async () => {
    const sdp = 'v=0\r\ns=-\r\n'
    await svc.handleOffer('A', makeOfferMsg({ sdp }))
    expect(errorsTo('A').length).toBe(1)
  })

  it('rejects offer missing s=', async () => {
    const sdp = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n'
    await svc.handleOffer('A', makeOfferMsg({ sdp }))
    expect(errorsTo('A').length).toBe(1)
  })

  it('rejects offer with empty sdp string', async () => {
    // Pass a hand-rolled offer object so handler-level "missing offer" guard
    // is satisfied but isValidSDP rejects on empty sdp.
    const offer = { type: 'offer', sdp: '' } as RTCSessionDescriptionInit
    await svc.handleOffer('A', makeOfferMsg({ offer: { ...offer, sdp: 'PLACEHOLDER' } }))
    // Replace with truly empty after constructing message:
    const msg = makeOfferMsg({})
    ;(msg as { offer: RTCSessionDescriptionInit }).offer = {
      type: 'offer',
      sdp: '',
    } as RTCSessionDescriptionInit
    sendToUserMock.mockReset()
    await svc.handleOffer('A', msg)
    // Empty sdp triggers the !data.offer guard OR isValidSDP — either way an error.
    const errs = errorsTo('A')
    expect(errs.length).toBeGreaterThanOrEqual(1)
    expect(['Missing conversationId or offer', 'Invalid offer format']).toContain(errs[0]!.message)
  })

  it('rejects offer where sdp is non-string', async () => {
    const msg = makeOfferMsg({})
    ;(msg as { offer: unknown }).offer = {
      type: 'offer',
      sdp: 12345 as unknown as string,
    }
    await svc.handleOffer('A', msg)
    expect(errorsTo('A').length).toBe(1)
    expect(errorsTo('A')[0]!.message).toBe('Invalid offer format')
  })
})

describe('VoIPService > ICE candidate validation', () => {
  let svc: VoIPService
  beforeEach(() => {
    resetMocks()
    svc = new VoIPService()
  })

  it('rejects candidate containing <script', async () => {
    await svc.handleIceCandidate(
      'A',
      makeIceMsg({ candidate: 'candidate:1 1 udp 2122 192.0.2.1 1234 typ host <script' })
    )
    // ICE handler does not send error to sender; just drops. Verify nothing was relayed.
    expect(relayedTo('B').length).toBe(0)
  })

  it('rejects candidate containing javascript:', async () => {
    await svc.handleIceCandidate(
      'A',
      makeIceMsg({ candidate: 'candidate:1 1 udp 2122 javascript:alert(1)' })
    )
    expect(relayedTo('B').length).toBe(0)
  })

  it('rejects candidate without "candidate:" prefix when non-empty', async () => {
    await svc.handleIceCandidate(
      'A',
      makeIceMsg({ candidate: 'foo 1 udp 2122 192.0.2.1 1234 typ host' })
    )
    expect(relayedTo('B').length).toBe(0)
  })

  it('accepts empty candidate (end-of-candidates marker)', async () => {
    await svc.handleIceCandidate('A', makeIceMsg({ candidate: '' }))
    // It should pass validation, hit participant lookup, and relay to B.
    const relayed = relayedTo('B').filter((m) => m.type === 'voip:ice_candidate')
    expect(relayed.length).toBe(1)
  })
})

describe('VoIPService > Authorization (non-participant rejection)', () => {
  let svc: VoIPService
  beforeEach(() => {
    resetMocks()
    svc = new VoIPService()
  })

  it('rejects offer from user C who is not in conversation A↔B', async () => {
    // Default participants are A and B; C is not.
    await svc.handleOffer('C', makeOfferMsg({}))
    const errs = errorsTo('C')
    expect(errs.length).toBe(1)
    expect(errs[0]!.message).toBe('Not authorized for this conversation')
    // No relay to B.
    expect(relayedTo('B').filter((m) => m.type === 'voip:offer').length).toBe(0)
  })

  it('rejects answer from non-participant C', async () => {
    await svc.handleAnswer('C', makeAnswerMsg({}))
    const errs = errorsTo('C')
    expect(errs.length).toBe(1)
    expect(errs[0]!.message).toBe('Not authorized for this conversation')
    expect(relayedTo('A').filter((m) => m.type === 'voip:answer').length).toBe(0)
  })

  it('drops ICE candidate from non-participant C silently', async () => {
    await svc.handleIceCandidate(
      'C',
      makeIceMsg({ candidate: 'candidate:1 1 udp 2122 192.0.2.1 1234 typ host' })
    )
    // ICE handler does not send error to sender on auth failure; just drops.
    expect(relayedTo('A').filter((m) => m.type === 'voip:ice_candidate').length).toBe(0)
    expect(relayedTo('B').filter((m) => m.type === 'voip:ice_candidate').length).toBe(0)
  })

  it('caller offer to non-participant targetUserId is silently dropped (no relay, no error)', async () => {
    // A is a participant; targetUserId Z is not. handleOffer should return early.
    await svc.handleOffer('A', makeOfferMsg({ targetUserId: 'Z' }))
    // Z must not receive the offer.
    expect(relayedTo('Z').length).toBe(0)
    // No error sent to A — just silent drop.
    expect(errorsTo('A').length).toBe(0)
    // And it must not broadcast either: B should not have received it.
    expect(relayedTo('B').filter((m) => m.type === 'voip:offer').length).toBe(0)
  })
})

describe('VoIPService > sanity: valid offer is relayed', () => {
  let svc: VoIPService
  beforeEach(() => {
    resetMocks()
    svc = new VoIPService()
  })

  it('valid offer from A reaches B', async () => {
    await svc.handleOffer('A', makeOfferMsg({}))
    const relayed = relayedTo('B').filter((m) => m.type === 'voip:offer')
    expect(relayed.length).toBe(1)
    expect(errorsTo('A').length).toBe(0)
  })
})
