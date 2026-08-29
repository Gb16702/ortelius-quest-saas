import { metricsApplicationService as metricsService } from '../../metrics/metrics.application'
import type { RequestCreationMetricsPort } from '../application/ports'

export class RequestCreationMetricsAdapter implements RequestCreationMetricsPort {
  async recordCreatedRequest(organizationId: string): Promise<void> {
    try {
      await metricsService.incrementRequestMetric(organizationId)
    } catch (error) {
      console.error('Failed to update metrics for request:', error)
    }
  }
}
