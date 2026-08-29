import { createCallMetricsUseCases } from '../application/call-metrics.use-cases'
import { callMetricsRepository } from './call-metrics.repository'
import { voipCallRepository } from './voip-call.repository'

export const callMetricsService = createCallMetricsUseCases({
  calls: voipCallRepository,
  metrics: callMetricsRepository,
})
