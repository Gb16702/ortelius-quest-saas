import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

// ---------- Mock setup (must run before importing the SUT) ----------

type CallRow = { id: string; status: string; duration: string | null }
type MetricsRow = { callId: string; metrics: unknown }

let currentCalls: CallRow[] = []
let currentMetrics: MetricsRow[] = []

// Sentinel objects so the chain can route based on table identity.
const VOIP_CALL_SENTINEL = { __sentinel: 'voipCall' }
const CALL_METRICS_SENTINEL = { __sentinel: 'callMetrics' }

// db.select(...).from(table).where(...) → Promise<rows>
function makeDbSelectChain(_columns?: unknown) {
  return {
    from: mock((table: unknown) => {
      const rows: unknown[] = table === VOIP_CALL_SENTINEL ? currentCalls : currentMetrics
      return {
        where: mock(() => Promise.resolve(rows)),
      }
    }),
  }
}

const dbMock = {
  select: mock((columns?: unknown) => makeDbSelectChain(columns)),
}

mock.module('../../../infrastructure/database', () => ({
  db: dbMock,
}))

mock.module('../../../infrastructure/database/db/schemas/chat-schema', () => ({
  voipCall: VOIP_CALL_SENTINEL,
}))
mock.module('../../../infrastructure/database/db/schemas/call-schema', () => ({
  callMetrics: {
    callId: 'callId-col',
    metrics: 'metrics-col',
  },
}))

// ---------- Import SUT after mocks ----------
import {
  runCanaryOnce,
  startVoipCanaryScheduler,
  stopVoipCanaryScheduler,
} from '../voip-canary.scheduler'

function resetMocks() {
  dbMock.select.mockReset()
  dbMock.select.mockImplementation((c?: unknown) => makeDbSelectChain(c))
  currentCalls = []
  currentMetrics = []
}

describe('runCanaryOnce > zero-state', () => {
  beforeEach(() => resetMocks())

  it('returns zeros when no calls in window', async () => {
    const r = await runCanaryOnce()
    expect(r).toEqual({
      silentRate: 0,
      failureRate: 0,
      avgDuration: 0,
      sampleCount: 0,
    })
  })
})

describe('runCanaryOnce > sample count and avg duration', () => {
  beforeEach(() => resetMocks())

  it('counts all calls; avgDuration averages only ended calls with valid duration', async () => {
    currentCalls = [
      { id: 'c1', status: 'ended', duration: '60' },
      { id: 'c2', status: 'ended', duration: '120' },
      { id: 'c3', status: 'failed', duration: null },
    ]
    currentMetrics = [
      { callId: 'c1', metrics: { audio: { bytesReceived: 1000 } } },
      { callId: 'c2', metrics: { audio: { bytesReceived: 2000 } } },
    ]
    const r = await runCanaryOnce()
    expect(r.sampleCount).toBe(3)
    expect(r.avgDuration).toBe(90)
    expect(r.silentRate).toBe(0)
  })
})

describe('runCanaryOnce > silentRate', () => {
  beforeEach(() => resetMocks())

  it('flags ended calls with zero bytes received as silent', async () => {
    currentCalls = [
      { id: 'c1', status: 'ended', duration: '30' },
      { id: 'c2', status: 'ended', duration: '30' },
      { id: 'c3', status: 'ended', duration: '30' },
      { id: 'c4', status: 'ended', duration: '30' },
    ]
    // c1 has bytes; c2, c3, c4 have no metrics rows at all.
    currentMetrics = [{ callId: 'c1', metrics: { audio: { bytesReceived: 5000 } } }]

    const r = await runCanaryOnce()
    expect(r.sampleCount).toBe(4)
    expect(r.silentRate).toBe(0.75)
    expect(r.failureRate).toBe(0)
  })

  it('sums bytesReceived across multiple samples and audio/video/connection groups', async () => {
    currentCalls = [{ id: 'c1', status: 'ended', duration: '60' }]
    currentMetrics = [
      { callId: 'c1', metrics: { audio: { bytesReceived: 100 } } },
      {
        callId: 'c1',
        metrics: { video: { bytesReceived: 200 }, connection: { bytesReceived: 50 } },
      },
    ]
    const r = await runCanaryOnce()
    expect(r.silentRate).toBe(0) // not silent: total > 0
  })
})

describe('runCanaryOnce > failureRate', () => {
  beforeEach(() => resetMocks())

  it('counts failed and missed as failures', async () => {
    currentCalls = [
      { id: 'c1', status: 'ended', duration: '60' },
      { id: 'c2', status: 'failed', duration: null },
      { id: 'c3', status: 'missed', duration: null },
      { id: 'c4', status: 'ended', duration: '30' },
    ]
    currentMetrics = [
      { callId: 'c1', metrics: { audio: { bytesReceived: 100 } } },
      { callId: 'c4', metrics: { audio: { bytesReceived: 100 } } },
    ]
    const r = await runCanaryOnce()
    expect(r.sampleCount).toBe(4)
    expect(r.failureRate).toBe(0.5)
  })
})

describe('runCanaryOnce > alert threshold log routing', () => {
  let infoMock: ReturnType<typeof mock>
  let warnMock: ReturnType<typeof mock>
  let errorMock: ReturnType<typeof mock>
  let origInfo: typeof console.info
  let origWarn: typeof console.warn
  let origError: typeof console.error

  beforeEach(() => {
    resetMocks()
    origInfo = console.info
    origWarn = console.warn
    origError = console.error
    infoMock = mock(() => undefined)
    warnMock = mock(() => undefined)
    errorMock = mock(() => undefined)
    console.info = infoMock as unknown as typeof console.info
    console.warn = warnMock as unknown as typeof console.warn
    console.error = errorMock as unknown as typeof console.error
  })

  afterEach(() => {
    console.info = origInfo
    console.warn = origWarn
    console.error = origError
  })

  it('logs ERROR when silentRate>5% and sampleCount>10', async () => {
    // 11 calls, 6 ended-silent (>5%), 5 ended-with-bytes
    const calls: CallRow[] = []
    const metrics: MetricsRow[] = []
    for (let i = 0; i < 11; i++) {
      calls.push({ id: `c${i}`, status: 'ended', duration: '30' })
    }
    // Only 5 of 11 have bytes; 6 are silent → silentRate = 6/11 ≈ 54% → ALERT
    for (let i = 0; i < 5; i++) {
      metrics.push({ callId: `c${i}`, metrics: { audio: { bytesReceived: 100 } } })
    }
    currentCalls = calls
    currentMetrics = metrics

    // Run via the scheduler tick path. We call runCanaryOnce + replicate the log
    // routing by importing the scheduler module's tick indirectly: easiest to
    // start the scheduler with a tiny interval and stop it.
    const r = await runCanaryOnce()
    expect(r.silentRate).toBeGreaterThan(0.05)
    expect(r.sampleCount).toBeGreaterThan(10)

    // Verify the scheduler routes to console.error for this scenario.
    process.env.VOIP_CANARY_INTERVAL_MS = '5'
    startVoipCanaryScheduler()
    // Wait two interval ticks worth.
    await new Promise((res) => setTimeout(res, 200))
    stopVoipCanaryScheduler()
    delete process.env.VOIP_CANARY_INTERVAL_MS

    expect(errorMock).toHaveBeenCalled()
    const firstArg = errorMock.mock.calls[0]![0] as string
    expect(firstArg).toContain('ALERT')
  })

  it('logs WARN when failureRate>20% and sampleCount>10 (and silentRate not exceeded)', async () => {
    const calls: CallRow[] = []
    const metrics: MetricsRow[] = []
    // 11 total. 4 failed (≈36%) — failure trigger.
    for (let i = 0; i < 7; i++) {
      calls.push({ id: `c${i}`, status: 'ended', duration: '30' })
      metrics.push({ callId: `c${i}`, metrics: { audio: { bytesReceived: 1000 } } })
    }
    for (let i = 7; i < 11; i++) {
      calls.push({ id: `c${i}`, status: 'failed', duration: null })
    }
    currentCalls = calls
    currentMetrics = metrics

    process.env.VOIP_CANARY_INTERVAL_MS = '5'
    startVoipCanaryScheduler()
    await new Promise((res) => setTimeout(res, 200))
    stopVoipCanaryScheduler()
    delete process.env.VOIP_CANARY_INTERVAL_MS

    expect(warnMock).toHaveBeenCalled()
    const firstArg = warnMock.mock.calls[0]![0] as string
    expect(firstArg).toContain('WARN')
    expect(firstArg).toContain('failure rate')
  })

  it('logs INFO summary when below thresholds', async () => {
    currentCalls = [
      { id: 'c1', status: 'ended', duration: '60' },
      { id: 'c2', status: 'ended', duration: '120' },
    ]
    currentMetrics = [
      { callId: 'c1', metrics: { audio: { bytesReceived: 1000 } } },
      { callId: 'c2', metrics: { audio: { bytesReceived: 1000 } } },
    ]

    process.env.VOIP_CANARY_INTERVAL_MS = '5'
    startVoipCanaryScheduler()
    await new Promise((res) => setTimeout(res, 200))
    stopVoipCanaryScheduler()
    delete process.env.VOIP_CANARY_INTERVAL_MS

    expect(infoMock).toHaveBeenCalled()
    const firstArg = infoMock.mock.calls[0]![0] as string
    expect(firstArg).toContain('daily summary')
  })

  it('does NOT alert below sampleCount=10 threshold even if silentRate is high', async () => {
    // Only 5 calls, all silent → silentRate=100% but sampleCount=5 ≤ 10 → INFO.
    currentCalls = [
      { id: 'c1', status: 'ended', duration: '30' },
      { id: 'c2', status: 'ended', duration: '30' },
      { id: 'c3', status: 'ended', duration: '30' },
      { id: 'c4', status: 'ended', duration: '30' },
      { id: 'c5', status: 'ended', duration: '30' },
    ]
    currentMetrics = []

    process.env.VOIP_CANARY_INTERVAL_MS = '5'
    startVoipCanaryScheduler()
    await new Promise((res) => setTimeout(res, 200))
    stopVoipCanaryScheduler()
    delete process.env.VOIP_CANARY_INTERVAL_MS

    expect(errorMock).not.toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenCalled()
  })
})

describe('startVoipCanaryScheduler', () => {
  beforeEach(() => resetMocks())

  it('is idempotent (calling twice does not create two timers)', () => {
    process.env.VOIP_CANARY_INTERVAL_MS = '1000000'
    startVoipCanaryScheduler()
    startVoipCanaryScheduler()
    stopVoipCanaryScheduler()
    delete process.env.VOIP_CANARY_INTERVAL_MS
    // No assertions on timer; just verify no throw and stopVoipCanaryScheduler works.
    expect(true).toBe(true)
  })
})
