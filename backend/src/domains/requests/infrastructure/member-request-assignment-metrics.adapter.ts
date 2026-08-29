import { memberMetricsService } from '../../metrics/services/member-metrics.service'
import type { RequestAssignmentMetricsPort } from '../application/ports'

export class MemberRequestAssignmentMetricsAdapter implements RequestAssignmentMetricsPort {
  async recordAssignedRequest(assignedToId: string, organizationId: string): Promise<void> {
    try {
      await memberMetricsService.incrementMemberRequest(assignedToId, organizationId)
    } catch (error) {
      console.error('Failed to update metrics for request assignment:', error)
    }
  }
}
