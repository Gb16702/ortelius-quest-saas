import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { voipCall } from '../../../infrastructure/database/db/schemas/chat-schema'
import { callEvents } from '../domain/call-events.service'
import { voipCallRepository } from './voip-call.repository'

const PENDING_TIMEOUT_MS = 30_000
const SWEEP_INTERVAL_MS = 10_000

let timer: NodeJS.Timeout | null = null

async function sweep(): Promise<void> {
  const threshold = new Date(Date.now() - PENDING_TIMEOUT_MS)
  const stale = await voipCallRepository.findPendingOlderThan(threshold)
  if (stale.length === 0) return

  for (const call of stale) {
    try {
      const [updated] = await db
        .update(voipCall)
        .set({ status: 'missed', endedAt: new Date() })
        .where(eq(voipCall.id, call.id))
        .returning()
      if (!updated) continue

      callEvents.publish({
        type: 'call.missed',
        callId: call.id,
        calleeId: call.calleeId ?? call.callerId,
      })
    } catch (err) {
      console.error('[call-missed-scheduler] failed to mark missed', call.id, err)
    }
  }
}

export function startCallMissedScheduler(): void {
  if (timer) return
  timer = setInterval(() => {
    sweep().catch((err) => console.error('[call-missed-scheduler] sweep failed', err))
  }, SWEEP_INTERVAL_MS)
}

export function stopCallMissedScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
