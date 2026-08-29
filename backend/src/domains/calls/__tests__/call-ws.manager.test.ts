import { beforeEach, describe, expect, it, mock } from 'bun:test'

// ---------- Mock setup (must run before importing the SUT) ----------

type CallRow = {
  id: string
  callerId: string
  calleeId: string | null
  status?: 'pending' | 'active' | 'ended' | 'rejected' | 'missed'
} | null

let currentCallRow: CallRow = null
let currentGroupParticipantRow: { userId: string } | undefined

const redisClient = {
  sadd: mock(() => Promise.resolve(1)),
  srem: mock(() => Promise.resolve(1)),
  sismember: mock(() => Promise.resolve(0)),
  rpush: mock(() => Promise.resolve(1)),
  expire: mock(() => Promise.resolve(1)),
  lrange: mock(() => Promise.resolve([] as string[])),
  del: mock(() => Promise.resolve(1)),
}

const subscribeHandlers: Array<(raw: unknown) => void> = []

const redisServiceMock = {
  getClient: mock(() => redisClient),
  subscribe: mock((_channel: string, handler: (raw: unknown) => void) => {
    subscribeHandlers.push(handler)
    return Promise.resolve()
  }),
  publish: mock(() => Promise.resolve()),
  getInstanceId: mock(() => 'test-instance-id'),
}

mock.module('../../../infrastructure/cache/redis.service', () => ({
  redisService: redisServiceMock,
  RedisChannels: {
    WS_MESSAGES: 'ws:messages',
    USER_PRESENCE: 'user:presence',
    CALL_WS_MESSAGES: 'call:ws:messages',
  },
}))

// Sentinel schema objects so the db mock can route `from()` correctly.
const VOIP_CALL_SENTINEL = { __sentinel: 'voipCall' }
const VOIP_CALL_PARTICIPANT_SENTINEL = { __sentinel: 'voipCallParticipant' }

// db.select().from(table).where(...).limit(...) → returns Promise<row[]>
// Routes based on which table is in `from()`. Default status is 'active' so
// existing fixtures that don't care about status keep working through the
// CALL_SIGNALING_STATUSES gate; tests that exercise terminal states set it
// explicitly on currentCallRow.
function makeDbSelectChain() {
  return {
    from: mock((table: unknown) => {
      const callRow =
        currentCallRow && currentCallRow.status === undefined
          ? { ...currentCallRow, status: 'active' as const }
          : currentCallRow
      const rows: unknown[] =
        table === VOIP_CALL_SENTINEL
          ? callRow
            ? [callRow]
            : []
          : currentGroupParticipantRow
            ? [currentGroupParticipantRow]
            : []
      return {
        where: mock(() => ({
          limit: mock(() => Promise.resolve(rows)),
        })),
      }
    }),
  }
}

const dbMock = {
  select: mock(() => makeDbSelectChain()),
  insert: mock(() => ({ values: mock(() => Promise.resolve()) })),
}

mock.module('../../../infrastructure/database', () => ({
  db: dbMock,
}))

// Schemas: expose the sentinels so the SUT's `from(voipCall)` calls land on the right branch.
mock.module('../../../infrastructure/database/db/schemas/chat-schema', () => ({
  voipCall: VOIP_CALL_SENTINEL,
  voipCallParticipant: VOIP_CALL_PARTICIPANT_SENTINEL,
}))
mock.module('../../../infrastructure/database/db/schemas/call-schema', () => ({
  callMetrics: {},
}))

// ---------- Import SUT after mocks ----------
import { CallWebSocketManager } from '../call-ws.manager'

// ---------- Helpers ----------
function makeWs() {
  return { send: mock(() => undefined as unknown as void), readyState: 1 }
}

type MgrInternals = {
  connections: Map<string, Set<{ send: ReturnType<typeof mock>; readyState?: number }>>
  callParticipants: Map<string, Set<string>>
  lastSeen: Map<unknown, number>
  STALE_TIMEOUT: number
  drainPendingMessages: (userId: string) => Promise<void>
  handleSignaling: (msg: Record<string, unknown>, senderId: string) => Promise<void>
  handleCallJoin: (callId: string, userId: string) => Promise<void>
  handleCallLeave: (callId: string, userId: string) => void
  handleParticipantMute: (callId: string, userId: string, isMuted: boolean) => void
  cleanupStaleConnections: () => void
}

function asInternals(m: CallWebSocketManager): MgrInternals {
  return m as unknown as MgrInternals
}

function resetMocks() {
  redisClient.sadd.mockReset()
  redisClient.sadd.mockImplementation(() => Promise.resolve(1))
  redisClient.srem.mockReset()
  redisClient.srem.mockImplementation(() => Promise.resolve(1))
  redisClient.sismember.mockReset()
  redisClient.sismember.mockImplementation(() => Promise.resolve(0))
  redisClient.rpush.mockReset()
  redisClient.rpush.mockImplementation(() => Promise.resolve(1))
  redisClient.expire.mockReset()
  redisClient.expire.mockImplementation(() => Promise.resolve(1))
  redisClient.lrange.mockReset()
  redisClient.lrange.mockImplementation(() => Promise.resolve([]))
  redisClient.del.mockReset()
  redisClient.del.mockImplementation(() => Promise.resolve(1))

  redisServiceMock.publish.mockReset()
  redisServiceMock.publish.mockImplementation(() => Promise.resolve())
  redisServiceMock.subscribe.mockReset()
  redisServiceMock.subscribe.mockImplementation((_c: string, h: (raw: unknown) => void) => {
    subscribeHandlers.push(h)
    return Promise.resolve()
  })
  redisServiceMock.getClient.mockReset()
  redisServiceMock.getClient.mockImplementation(() => redisClient)
  redisServiceMock.getInstanceId.mockReset()
  redisServiceMock.getInstanceId.mockImplementation(() => 'test-instance-id')

  subscribeHandlers.length = 0

  // db.select() routes off the table passed to `from()` (see makeDbSelectChain).
  dbMock.select.mockReset()
  dbMock.select.mockImplementation(() => makeDbSelectChain())

  currentCallRow = null
  currentGroupParticipantRow = undefined
}

// Wait for any pending microtasks/promise chains.
async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

// ---------- Tests ----------

describe('CallWebSocketManager > handleConnection', () => {
  let mgr: CallWebSocketManager
  beforeEach(() => {
    resetMocks()
    mgr = new CallWebSocketManager()
  })

  it('adds ws to connections map under userId', () => {
    const ws = makeWs()
    mgr.handleConnection(ws, 'user-1')
    const internals = asInternals(mgr)
    expect(internals.connections.has('user-1')).toBe(true)
    expect(internals.connections.get('user-1')!.has(ws)).toBe(true)
    expect(internals.lastSeen.has(ws)).toBe(true)
  })

  it('sends connection:established to the new ws', () => {
    const ws = makeWs()
    mgr.handleConnection(ws, 'user-1')
    expect(ws.send).toHaveBeenCalledTimes(1)
    const sent = JSON.parse(ws.send.mock.calls[0]![0] as string)
    expect(sent.type).toBe('connection:established')
    expect(sent.userId).toBe('user-1')
    expect(typeof sent.timestamp).toBe('string')
  })

  it('adds userId to Redis online set', async () => {
    const ws = makeWs()
    mgr.handleConnection(ws, 'user-1')
    await flush()
    expect(redisClient.sadd).toHaveBeenCalledWith('call-ws:online', 'user-1')
  })

  it('drains pending messages from Redis (lrange returns 2 stored msgs → both delivered)', async () => {
    const ws = makeWs()
    redisClient.lrange.mockImplementationOnce(() =>
      Promise.resolve([
        JSON.stringify({ type: 'webrtc:offer', callId: 'c1', from: 'other' }),
        JSON.stringify({ type: 'webrtc:ice', callId: 'c1', from: 'other' }),
      ])
    )
    mgr.handleConnection(ws, 'user-1')
    await asInternals(mgr).drainPendingMessages('user-1')

    // 1 connection:established + 2 drained payloads
    expect(ws.send).toHaveBeenCalledTimes(3)
    const second = JSON.parse(ws.send.mock.calls[1]![0] as string)
    const third = JSON.parse(ws.send.mock.calls[2]![0] as string)
    expect(second.type).toBe('webrtc:offer')
    expect(third.type).toBe('webrtc:ice')
    expect(redisClient.del).toHaveBeenCalledWith('signal:pending:user-1')
  })
})

describe('CallWebSocketManager > handleDisconnection', () => {
  let mgr: CallWebSocketManager
  beforeEach(() => {
    resetMocks()
    mgr = new CallWebSocketManager()
  })

  it('removes ws, keeps userId online if other connections exist', () => {
    const a = makeWs()
    const b = makeWs()
    mgr.handleConnection(a, 'user-1')
    mgr.handleConnection(b, 'user-1')
    redisClient.srem.mockClear()

    mgr.handleDisconnection(a, 'user-1')

    const internals = asInternals(mgr)
    expect(internals.connections.has('user-1')).toBe(true)
    expect(internals.connections.get('user-1')!.has(a)).toBe(false)
    expect(internals.connections.get('user-1')!.has(b)).toBe(true)
    expect(redisClient.srem).not.toHaveBeenCalled()
  })

  it('removes userId from Redis online set when last connection closes', async () => {
    const ws = makeWs()
    mgr.handleConnection(ws, 'user-1')
    redisClient.srem.mockClear()

    mgr.handleDisconnection(ws, 'user-1')
    await flush()

    const internals = asInternals(mgr)
    expect(internals.connections.has('user-1')).toBe(false)
    expect(redisClient.srem).toHaveBeenCalledWith('call-ws:online', 'user-1')
  })
})

describe('CallWebSocketManager > handleCallJoin', () => {
  let mgr: CallWebSocketManager
  beforeEach(() => {
    resetMocks()
    mgr = new CallWebSocketManager()
  })

  it('1-1 call: caller join → callee receives participant:joined', async () => {
    currentCallRow = { id: 'call-1', callerId: 'caller', calleeId: 'callee' }
    const calleeWs = makeWs()
    mgr.handleConnection(calleeWs, 'callee')
    calleeWs.send.mockReset()

    await asInternals(mgr).handleCallJoin('call-1', 'caller')

    const messages = calleeWs.send.mock.calls.map((c) => JSON.parse(c[0] as string))
    const joined = messages.find((m) => m.type === 'participant:joined')
    expect(joined).toBeDefined()
    expect(joined.userId).toBe('caller')
    expect(joined.callId).toBe('call-1')
  })

  it('callee join → caller receives participant:joined', async () => {
    currentCallRow = { id: 'call-1', callerId: 'caller', calleeId: 'callee' }
    const callerWs = makeWs()
    mgr.handleConnection(callerWs, 'caller')
    callerWs.send.mockReset()

    await asInternals(mgr).handleCallJoin('call-1', 'callee')

    const messages = callerWs.send.mock.calls.map((c) => JSON.parse(c[0] as string))
    const joined = messages.find((m) => m.type === 'participant:joined')
    expect(joined).toBeDefined()
    expect(joined.userId).toBe('callee')
  })

  it('joiner receives call:ready', async () => {
    currentCallRow = { id: 'call-1', callerId: 'caller', calleeId: 'callee' }
    const callerWs = makeWs()
    mgr.handleConnection(callerWs, 'caller')
    callerWs.send.mockReset()

    await asInternals(mgr).handleCallJoin('call-1', 'caller')

    const messages = callerWs.send.mock.calls.map((c) => JSON.parse(c[0] as string))
    const ready = messages.find((m) => m.type === 'call:ready')
    expect(ready).toBeDefined()
    expect(ready.callId).toBe('call-1')
  })

  it('non-participant rejection throws "You are not a participant of this call"', async () => {
    currentCallRow = { id: 'call-1', callerId: 'caller', calleeId: 'callee' }
    currentGroupParticipantRow = undefined

    await expect(asInternals(mgr).handleCallJoin('call-1', 'stranger')).rejects.toThrow(
      'You are not a participant of this call'
    )
  })

  it('group call (calleeId null) → broadcast to other tracked participants', async () => {
    // user-a joins first as caller
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: null }
    const wsA = makeWs()
    mgr.handleConnection(wsA, 'user-a')
    wsA.send.mockReset()
    await asInternals(mgr).handleCallJoin('call-1', 'user-a')

    // user-b is not the caller, fall through to voipCallParticipant lookup.
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: null }
    currentGroupParticipantRow = { userId: 'user-b' }
    const wsB = makeWs()
    mgr.handleConnection(wsB, 'user-b')
    wsA.send.mockReset()
    wsB.send.mockReset()

    await asInternals(mgr).handleCallJoin('call-1', 'user-b')

    const aMsgs = wsA.send.mock.calls.map((c) => JSON.parse(c[0] as string))
    const bMsgs = wsB.send.mock.calls.map((c) => JSON.parse(c[0] as string))
    expect(
      aMsgs.find((m) => m.type === 'participant:joined' && m.userId === 'user-b')
    ).toBeDefined()
    // Joiner should not receive its own joined event but should receive call:ready
    expect(bMsgs.find((m) => m.type === 'call:ready')).toBeDefined()
    expect(
      bMsgs.find((m) => m.type === 'participant:joined' && m.userId === 'user-b')
    ).toBeUndefined()
  })
})

describe('CallWebSocketManager > handleSignaling', () => {
  let mgr: CallWebSocketManager
  beforeEach(() => {
    resetMocks()
    mgr = new CallWebSocketManager()
  })

  it('caller sends offer → callee receives it with from: callerId', async () => {
    currentCallRow = { id: 'call-1', callerId: 'caller', calleeId: 'callee' }
    const calleeWs = makeWs()
    mgr.handleConnection(calleeWs, 'callee')
    calleeWs.send.mockReset()

    await asInternals(mgr).handleSignaling(
      { type: 'webrtc:offer', callId: 'call-1', sdp: 'fake-sdp' },
      'caller'
    )

    expect(calleeWs.send).toHaveBeenCalled()
    const sent = JSON.parse(calleeWs.send.mock.calls[0]![0] as string)
    expect(sent.type).toBe('webrtc:offer')
    expect(sent.from).toBe('caller')
    expect(sent.sdp).toBe('fake-sdp')
  })

  it('callee sends answer → caller receives it', async () => {
    currentCallRow = { id: 'call-1', callerId: 'caller', calleeId: 'callee' }
    const callerWs = makeWs()
    mgr.handleConnection(callerWs, 'caller')
    callerWs.send.mockReset()

    await asInternals(mgr).handleSignaling(
      { type: 'webrtc:answer', callId: 'call-1', sdp: 'answer-sdp' },
      'callee'
    )

    expect(callerWs.send).toHaveBeenCalled()
    const sent = JSON.parse(callerWs.send.mock.calls[0]![0] as string)
    expect(sent.type).toBe('webrtc:answer')
    expect(sent.from).toBe('callee')
  })

  it('non-participant offer rejected', async () => {
    currentCallRow = { id: 'call-1', callerId: 'caller', calleeId: 'callee' }

    await expect(
      asInternals(mgr).handleSignaling(
        { type: 'webrtc:offer', callId: 'call-1', sdp: 'x' },
        'stranger'
      )
    ).rejects.toThrow('You are not a participant of this call')
  })

  it('group call: relays to broadcasted participants', async () => {
    // Track group participants via handleCallJoin first.
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: null }
    const wsA = makeWs()
    mgr.handleConnection(wsA, 'user-a')
    await asInternals(mgr).handleCallJoin('call-1', 'user-a')

    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: null }
    currentGroupParticipantRow = { userId: 'user-b' }
    const wsB = makeWs()
    mgr.handleConnection(wsB, 'user-b')
    await asInternals(mgr).handleCallJoin('call-1', 'user-b')

    wsA.send.mockReset()
    wsB.send.mockReset()
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: null }

    // user-b is not caller and calleeId is null → broadcast path.
    await asInternals(mgr).handleSignaling(
      { type: 'webrtc:ice', callId: 'call-1', candidate: 'c' },
      'user-b'
    )

    const aMsgs = wsA.send.mock.calls.map((c) => JSON.parse(c[0] as string))
    expect(aMsgs.some((m) => m.type === 'webrtc:ice' && m.from === 'user-b')).toBe(true)
    // Sender (user-b) should be excluded.
    expect(wsB.send).not.toHaveBeenCalled()
  })

  it('group call: rejects signaling from a stranger not in voipCallParticipant', async () => {
    // calleeId is null → group call. The sender ('stranger') is not the
    // caller and not in voipCallParticipant. Pre-fix, the broadcast branch
    // ran without checking membership.
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: null }
    currentGroupParticipantRow = undefined
    await expect(
      asInternals(mgr).handleSignaling(
        { type: 'webrtc:offer', callId: 'call-1', sdp: 'v=0' },
        'stranger'
      )
    ).rejects.toThrow('You are not a participant of this call')
  })
})

describe('CallWebSocketManager > terminal-state gating', () => {
  let mgr: CallWebSocketManager
  beforeEach(() => {
    resetMocks()
    mgr = new CallWebSocketManager()
  })

  it('rejects call:join when call.status is ended', async () => {
    currentCallRow = {
      id: 'call-1',
      callerId: 'caller',
      calleeId: 'callee',
      status: 'ended',
    }
    await expect(asInternals(mgr).handleCallJoin('call-1', 'caller')).rejects.toThrow(
      /Call is ended/
    )
  })

  it('rejects webrtc:offer when call.status is rejected', async () => {
    currentCallRow = {
      id: 'call-1',
      callerId: 'caller',
      calleeId: 'callee',
      status: 'rejected',
    }
    await expect(
      asInternals(mgr).handleSignaling(
        { type: 'webrtc:offer', callId: 'call-1', sdp: 'v=0' },
        'caller'
      )
    ).rejects.toThrow(/Call is rejected/)
  })

  it('accepts signaling when call.status is pending', async () => {
    currentCallRow = {
      id: 'call-1',
      callerId: 'caller',
      calleeId: 'callee',
      status: 'pending',
    }
    const wsCallee = makeWs()
    mgr.handleConnection(wsCallee, 'callee')
    await asInternals(mgr).handleSignaling(
      { type: 'webrtc:offer', callId: 'call-1', sdp: 'v=0' },
      'caller'
    )
    expect(wsCallee.send).toHaveBeenCalled()
  })
})

describe('CallWebSocketManager > handleCallLeave', () => {
  let mgr: CallWebSocketManager
  beforeEach(() => {
    resetMocks()
    mgr = new CallWebSocketManager()
  })

  it('broadcasts participant:left to remaining participants', async () => {
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: 'user-b' }
    const wsA = makeWs()
    const wsB = makeWs()
    mgr.handleConnection(wsA, 'user-a')
    mgr.handleConnection(wsB, 'user-b')
    await asInternals(mgr).handleCallJoin('call-1', 'user-a')
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: 'user-b' }
    await asInternals(mgr).handleCallJoin('call-1', 'user-b')

    wsA.send.mockReset()
    wsB.send.mockReset()

    asInternals(mgr).handleCallLeave('call-1', 'user-a')

    const bMsgs = wsB.send.mock.calls.map((c) => JSON.parse(c[0] as string))
    expect(bMsgs.some((m) => m.type === 'participant:left' && m.userId === 'user-a')).toBe(true)
  })

  it('removes user from callParticipants map', async () => {
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: 'user-b' }
    const wsA = makeWs()
    const wsB = makeWs()
    mgr.handleConnection(wsA, 'user-a')
    mgr.handleConnection(wsB, 'user-b')
    await asInternals(mgr).handleCallJoin('call-1', 'user-a')
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: 'user-b' }
    await asInternals(mgr).handleCallJoin('call-1', 'user-b')

    asInternals(mgr).handleCallLeave('call-1', 'user-a')

    const remaining = mgr.getCallParticipants('call-1')
    expect(remaining).toEqual(['user-b'])
  })

  it('deletes empty call entry', async () => {
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: 'user-b' }
    const wsA = makeWs()
    mgr.handleConnection(wsA, 'user-a')
    await asInternals(mgr).handleCallJoin('call-1', 'user-a')

    asInternals(mgr).handleCallLeave('call-1', 'user-a')

    expect(asInternals(mgr).callParticipants.has('call-1')).toBe(false)
  })
})

describe('CallWebSocketManager > handleParticipantMute', () => {
  let mgr: CallWebSocketManager
  beforeEach(() => {
    resetMocks()
    mgr = new CallWebSocketManager()
  })

  it('broadcasts participant:mute to all in call except sender', async () => {
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: 'user-b' }
    const wsA = makeWs()
    const wsB = makeWs()
    mgr.handleConnection(wsA, 'user-a')
    mgr.handleConnection(wsB, 'user-b')
    await asInternals(mgr).handleCallJoin('call-1', 'user-a')
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: 'user-b' }
    await asInternals(mgr).handleCallJoin('call-1', 'user-b')

    wsA.send.mockReset()
    wsB.send.mockReset()

    asInternals(mgr).handleParticipantMute('call-1', 'user-a', true)

    expect(wsA.send).not.toHaveBeenCalled()
    const bMsgs = wsB.send.mock.calls.map((c) => JSON.parse(c[0] as string))
    const muteMsg = bMsgs.find((m) => m.type === 'participant:mute')
    expect(muteMsg).toBeDefined()
    expect(muteMsg.userId).toBe('user-a')
    expect(muteMsg.isMuted).toBe(true)
  })
})

describe('CallWebSocketManager > sendToUser', () => {
  let mgr: CallWebSocketManager
  beforeEach(() => {
    resetMocks()
    mgr = new CallWebSocketManager()
  })

  it('delivers locally if connected', () => {
    const ws = makeWs()
    mgr.handleConnection(ws, 'user-1')
    ws.send.mockReset()

    mgr.sendToUser('user-1', { type: 'webrtc:offer', callId: 'c1' })

    expect(ws.send).toHaveBeenCalledTimes(1)
    const msg = JSON.parse(ws.send.mock.calls[0]![0] as string)
    expect(msg.type).toBe('webrtc:offer')
  })

  it('publishes to Redis pub/sub regardless', async () => {
    const ws = makeWs()
    mgr.handleConnection(ws, 'user-1')
    redisServiceMock.publish.mockClear()

    mgr.sendToUser('user-1', { type: 'webrtc:offer', callId: 'c1' })
    await flush()

    expect(redisServiceMock.publish).toHaveBeenCalledTimes(1)
    const [channel, payload, includeSource] = redisServiceMock.publish.mock.calls[0]!
    expect(channel).toBe('call:ws:messages')
    expect((payload as { kind: string }).kind).toBe('send-to-user')
    expect((payload as { targetUserId: string }).targetUserId).toBe('user-1')
    expect(includeSource).toBe(true)
  })

  it('buffers in Redis if user not online globally', async () => {
    redisClient.sismember.mockImplementationOnce(() => Promise.resolve(0))

    mgr.sendToUser('offline-user', { type: 'webrtc:offer', callId: 'c1' })
    await flush()
    await flush()

    expect(redisClient.rpush).toHaveBeenCalledWith(
      'signal:pending:offline-user',
      expect.any(String)
    )
    expect(redisClient.expire).toHaveBeenCalledWith('signal:pending:offline-user', 30)
  })
})

describe('CallWebSocketManager > Redis pub/sub', () => {
  let mgr: CallWebSocketManager
  let handler: (raw: unknown) => void

  beforeEach(async () => {
    resetMocks()
    mgr = new CallWebSocketManager()
    mgr.start()
    await flush()
    handler = subscribeHandlers[0]!
  })

  it('skips messages with sourceInstanceId matching own instance', () => {
    const ws = makeWs()
    mgr.handleConnection(ws, 'user-1')
    ws.send.mockReset()

    handler({
      kind: 'send-to-user',
      targetUserId: 'user-1',
      payload: { type: 'webrtc:offer', callId: 'c1' },
      sourceInstanceId: 'test-instance-id',
    })

    expect(ws.send).not.toHaveBeenCalled()
  })

  it('send-to-user kind triggers local delivery', () => {
    const ws = makeWs()
    mgr.handleConnection(ws, 'user-1')
    ws.send.mockReset()

    handler({
      kind: 'send-to-user',
      targetUserId: 'user-1',
      payload: { type: 'webrtc:offer', callId: 'c1' },
      sourceInstanceId: 'other-instance',
    })

    expect(ws.send).toHaveBeenCalledTimes(1)
    const msg = JSON.parse(ws.send.mock.calls[0]![0] as string)
    expect(msg.type).toBe('webrtc:offer')
  })

  it('broadcast-to-call kind triggers local broadcast', async () => {
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: 'user-b' }
    const wsA = makeWs()
    const wsB = makeWs()
    mgr.handleConnection(wsA, 'user-a')
    mgr.handleConnection(wsB, 'user-b')
    await asInternals(mgr).handleCallJoin('call-1', 'user-a')
    currentCallRow = { id: 'call-1', callerId: 'user-a', calleeId: 'user-b' }
    await asInternals(mgr).handleCallJoin('call-1', 'user-b')

    wsA.send.mockReset()
    wsB.send.mockReset()

    handler({
      kind: 'broadcast-to-call',
      callId: 'call-1',
      excludeUserId: 'user-a',
      payload: { type: 'participant:left', callId: 'call-1', userId: 'user-a' },
      sourceInstanceId: 'other-instance',
    })

    expect(wsA.send).not.toHaveBeenCalled()
    expect(wsB.send).toHaveBeenCalledTimes(1)
    const msg = JSON.parse(wsB.send.mock.calls[0]![0] as string)
    expect(msg.type).toBe('participant:left')
  })
})

describe('CallWebSocketManager > cleanupStaleConnections', () => {
  let mgr: CallWebSocketManager
  beforeEach(() => {
    resetMocks()
    mgr = new CallWebSocketManager()
  })

  it('removes ws inactive for >5min', () => {
    const stale = makeWs()
    mgr.handleConnection(stale, 'user-stale')
    const internals = asInternals(mgr)
    // Force lastSeen to be way in the past.
    internals.lastSeen.set(stale, Date.now() - (internals.STALE_TIMEOUT + 1000))

    internals.cleanupStaleConnections()

    expect(internals.connections.has('user-stale')).toBe(false)
    expect(internals.lastSeen.has(stale)).toBe(false)
  })

  it('keeps fresh ws', () => {
    const fresh = makeWs()
    mgr.handleConnection(fresh, 'user-fresh')
    const internals = asInternals(mgr)
    internals.lastSeen.set(fresh, Date.now())

    internals.cleanupStaleConnections()

    expect(internals.connections.has('user-fresh')).toBe(true)
    expect(internals.connections.get('user-fresh')!.has(fresh)).toBe(true)
  })
})
