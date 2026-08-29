import type { CallRecord, MetricsSample } from '../domain/calls.types'

export interface CallLookupPort {
  findById(callId: string): Promise<CallRecord | null>
}

export interface CallMetricsStore {
  storeBatch(callId: string, userId: string, samples: MetricsSample[]): Promise<number>
}

export function createCallMetricsUseCases(deps: {
  calls: CallLookupPort
  metrics: CallMetricsStore
}) {
  return {
    async storeBatch(callId: string, userId: string, samples: MetricsSample[]): Promise<number> {
      if (samples.length === 0) return 0

      const call = await deps.calls.findById(callId)
      if (!call) throw new Error('Call not found')
      if (call.callerId !== userId && call.calleeId !== userId) {
        throw new Error('Not a participant')
      }

      return deps.metrics.storeBatch(callId, userId, samples)
    },
  }
}
