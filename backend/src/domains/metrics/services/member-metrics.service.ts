import { type MetricsApplicationService, metricsApplicationService } from '../metrics.application'

export class MemberMetricsService {
  constructor(private readonly metrics: MetricsApplicationService = metricsApplicationService) {}

  async incrementMemberRequest(userId: string, organizationId: string): Promise<void> {
    return await this.metrics.incrementMemberRequest(userId, organizationId)
  }

  async incrementMemberQuote(
    userId: string,
    organizationId: string,
    revenue?: number
  ): Promise<void> {
    return await this.metrics.incrementMemberQuote(userId, organizationId, revenue)
  }

  async incrementMemberInvoice(
    userId: string,
    organizationId: string,
    revenue?: number
  ): Promise<void> {
    return await this.metrics.incrementMemberInvoice(userId, organizationId, revenue)
  }

  async incrementMemberConversation(userId: string, organizationId: string): Promise<void> {
    return await this.metrics.incrementMemberConversation(userId, organizationId)
  }

  async incrementMemberMessage(userId: string, organizationId: string): Promise<void> {
    return await this.metrics.incrementMemberMessage(userId, organizationId)
  }

  async getMemberMetrics(userId: string, organizationId: string) {
    return await this.metrics.getMemberMetrics(userId, organizationId)
  }

  async getMemberDailyMetrics(userId: string, organizationId: string, days?: number) {
    return await this.metrics.getMemberDailyMetrics(userId, organizationId, days)
  }

  async getAllMembersMetrics(organizationId: string) {
    return await this.metrics.getAllMembersMetrics(organizationId)
  }
}

export const memberMetricsService = new MemberMetricsService()
