import { db } from '../../../infrastructure/database'
import { callMetrics } from '../../../infrastructure/database/db/schemas/call-schema'
import type { MetricsSample } from '../domain/calls.types'

export const callMetricsRepository = {
  async storeBatch(callId: string, userId: string, samples: MetricsSample[]): Promise<number> {
    const rows = samples.map((s) => ({
      callId,
      userId,
      timestamp: new Date(s.timestamp),
      metrics: s.metrics,
    }))

    await db.insert(callMetrics).values(rows)
    return rows.length
  },
}
