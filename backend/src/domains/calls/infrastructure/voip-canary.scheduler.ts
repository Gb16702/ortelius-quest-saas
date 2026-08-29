import { and, eq, gte, inArray, or } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { callMetrics } from '../../../infrastructure/database/db/schemas/call-schema'
import { voipCall } from '../../../infrastructure/database/db/schemas/chat-schema'

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24h
const SILENT_RATE_ALERT_THRESHOLD = 0.05 // 5%
const FAILURE_RATE_WARN_THRESHOLD = 0.2 // 20%
const MIN_SAMPLE_COUNT = 10

let timer: NodeJS.Timeout | null = null

export type CanaryReport = {
  silentRate: number
  failureRate: number
  avgDuration: number
  sampleCount: number
}

type MetricsRow = { callId: string; metrics: unknown }

function extractBytesReceived(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0
  const m = raw as Record<string, unknown>
  let total = 0
  for (const key of ['audio', 'video', 'connection']) {
    const sub = m[key]
    if (sub && typeof sub === 'object') {
      const br = (sub as Record<string, unknown>).bytesReceived
      if (typeof br === 'number' && Number.isFinite(br)) {
        total += br
      } else if (typeof br === 'string') {
        const parsed = Number(br)
        if (Number.isFinite(parsed)) total += parsed
      }
    }
  }
  // Also support flat shape: { bytesReceived: <n> }
  const flatBr = m.bytesReceived
  if (typeof flatBr === 'number' && Number.isFinite(flatBr)) total += flatBr
  return total
}

function parseDuration(raw: string | null | undefined): number {
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export async function runCanaryOnce(): Promise<CanaryReport> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Fetch completed calls in the last 24h: ended | failed | missed.
  const calls = (await db
    .select()
    .from(voipCall)
    .where(
      and(
        gte(voipCall.startedAt, since),
        or(
          eq(voipCall.status, 'ended'),
          // Note: 'failed' is not in the current enum; included defensively per spec.
          // biome-ignore lint/suspicious/noExplicitAny: status enum may expand
          eq(voipCall.status, 'failed' as any),
          eq(voipCall.status, 'missed')
        )
      )
    )) as Array<{
    id: string
    status: string
    duration: string | null
  }>

  const sampleCount = calls.length
  if (sampleCount === 0) {
    return { silentRate: 0, failureRate: 0, avgDuration: 0, sampleCount: 0 }
  }

  // Bytes-received per call across all samples and users.
  const callIds = calls.map((c) => c.id)
  const metricsRows = (await db
    .select({ callId: callMetrics.callId, metrics: callMetrics.metrics })
    .from(callMetrics)
    .where(inArray(callMetrics.callId, callIds))) as MetricsRow[]

  const bytesByCall = new Map<string, number>()
  for (const row of metricsRows) {
    const prev = bytesByCall.get(row.callId) ?? 0
    bytesByCall.set(row.callId, prev + extractBytesReceived(row.metrics))
  }

  let silentCount = 0
  let failureCount = 0
  let endedCount = 0
  let durationSum = 0

  for (const call of calls) {
    if (call.status === 'ended') {
      endedCount++
      durationSum += parseDuration(call.duration)
      const bytes = bytesByCall.get(call.id) ?? 0
      if (bytes === 0) silentCount++
    } else if (call.status === 'failed' || call.status === 'missed') {
      failureCount++
    }
  }

  const silentRate = sampleCount > 0 ? silentCount / sampleCount : 0
  const failureRate = sampleCount > 0 ? failureCount / sampleCount : 0
  const avgDuration = endedCount > 0 ? durationSum / endedCount : 0

  return { silentRate, failureRate, avgDuration, sampleCount }
}

async function tick(): Promise<void> {
  try {
    const report = await runCanaryOnce()
    const summary = {
      silentRatePct: +(report.silentRate * 100).toFixed(2),
      failureRatePct: +(report.failureRate * 100).toFixed(2),
      avgDurationSec: +report.avgDuration.toFixed(2),
      sampleCount: report.sampleCount,
    }

    if (report.silentRate > SILENT_RATE_ALERT_THRESHOLD && report.sampleCount > MIN_SAMPLE_COUNT) {
      console.error(
        `[voip-canary] ALERT: silent-call rate ${summary.silentRatePct}% over ${summary.sampleCount} calls (threshold 5%)`,
        summary
      )
    } else if (
      report.failureRate > FAILURE_RATE_WARN_THRESHOLD &&
      report.sampleCount > MIN_SAMPLE_COUNT
    ) {
      console.warn(
        `[voip-canary] WARN: failure rate ${summary.failureRatePct}% over ${summary.sampleCount} calls (threshold 20%)`,
        summary
      )
    } else {
      console.info('[voip-canary] daily summary', summary)
    }
  } catch (err) {
    console.error('[voip-canary] tick failed', err)
  }
}

function getIntervalMs(): number {
  const raw = process.env.VOIP_CANARY_INTERVAL_MS
  if (!raw) return DEFAULT_INTERVAL_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_INTERVAL_MS
  return parsed
}

export function startVoipCanaryScheduler(): void {
  if (timer) return
  const intervalMs = getIntervalMs()
  timer = setInterval(() => {
    tick().catch((err) => console.error('[voip-canary] scheduled tick failed', err))
  }, intervalMs)
}

export function stopVoipCanaryScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
