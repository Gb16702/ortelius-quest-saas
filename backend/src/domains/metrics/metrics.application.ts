import type {
  MemberDailyMetrics,
  MemberMetrics,
  MemberMetricsResponse,
  MemberMetricsSummary,
  MetricsResponse,
  OrganizationDailyMetrics,
  OrganizationMetrics,
  OrganizationMetricsSummary,
  RecentOrganizationRequest,
} from './domain/metrics-models'
import {
  getMetricsUseCases,
  type MetricsUseCaseContainer,
} from './infrastructure/metrics-use-cases'

export interface MetricsOrganizationDescriptor {
  id: string
  name: string
  slug: string | null
}

export class MetricsApplicationService {
  constructor(private readonly injectedUseCases?: MetricsUseCaseContainer) {}

  async incrementRequestMetric(organizationId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.recordOrganizationRequestMetric.execute(organizationId)
  }

  async incrementNewVisitorMetric(organizationId: string, visitorHash: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.recordNewVisitorMetric.execute(organizationId, visitorHash)
  }

  async incrementQuoteMetric(organizationId: string, revenue?: number): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.recordQuoteMetric.execute(organizationId, revenue)
  }

  async incrementInvoiceMetric(organizationId: string, revenue?: number): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.recordInvoiceMetric.execute(organizationId, revenue)
  }

  async getOrganizationMetrics(organizationId: string): Promise<OrganizationMetrics | null> {
    const useCases = await this.getUseCases()
    return await useCases.getOrganizationMetrics.execute(organizationId)
  }

  async getOrganizationDailyMetrics(
    organizationId: string,
    days?: number
  ): Promise<OrganizationDailyMetrics[]> {
    const useCases = await this.getUseCases()
    return await useCases.getOrganizationDailyMetrics.execute(organizationId, days)
  }

  async getOrganizationMetricsResponse(
    organization: MetricsOrganizationDescriptor,
    days?: number
  ): Promise<MetricsResponse> {
    const useCases = await this.getUseCases()
    return await useCases.getOrganizationMetricsResponse.execute(organization, days)
  }

  async getOrganizationMetricsSummary(
    organizationId: string,
    days?: number
  ): Promise<OrganizationMetricsSummary> {
    const useCases = await this.getUseCases()
    return await useCases.getOrganizationMetricsSummary.execute(organizationId, days)
  }

  async incrementMemberRequest(userId: string, organizationId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.recordMemberRequestMetric.execute(userId, organizationId)
  }

  async incrementMemberQuote(
    userId: string,
    organizationId: string,
    revenue?: number
  ): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.recordMemberQuoteMetric.execute(userId, organizationId, revenue)
  }

  async incrementMemberInvoice(
    userId: string,
    organizationId: string,
    revenue?: number
  ): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.recordMemberInvoiceMetric.execute(userId, organizationId, revenue)
  }

  async incrementMemberConversation(userId: string, organizationId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.recordMemberConversationMetric.execute(userId, organizationId)
  }

  async incrementMemberMessage(userId: string, organizationId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.recordMemberMessageMetric.execute(userId, organizationId)
  }

  async getMemberMetrics(userId: string, organizationId: string): Promise<MemberMetrics | null> {
    const useCases = await this.getUseCases()
    return await useCases.getMemberMetrics.execute(userId, organizationId)
  }

  async getMemberDailyMetrics(
    userId: string,
    organizationId: string,
    days?: number
  ): Promise<MemberDailyMetrics[]> {
    const useCases = await this.getUseCases()
    return await useCases.getMemberDailyMetrics.execute(userId, organizationId, days)
  }

  async getMemberMetricsResponse(input: {
    userId: string
    organization: MetricsOrganizationDescriptor & { slug: string }
    days?: number
  }): Promise<MemberMetricsResponse> {
    const useCases = await this.getUseCases()
    return await useCases.getMemberMetricsResponse.execute(input)
  }

  async getMemberMetricsSummary(
    userId: string,
    organizationId: string,
    days?: number
  ): Promise<MemberMetricsSummary> {
    const useCases = await this.getUseCases()
    return await useCases.getMemberMetricsSummary.execute(userId, organizationId, days)
  }

  async getAllMembersMetrics(organizationId: string): Promise<MemberMetrics[]> {
    const useCases = await this.getUseCases()
    return await useCases.getAllMembersMetrics.execute(organizationId)
  }

  async listOrganizationMembersMetrics(input: {
    organization: MetricsOrganizationDescriptor & { slug: string }
    days?: number
  }): Promise<MemberMetricsResponse[]> {
    const useCases = await this.getUseCases()
    return await useCases.listOrganizationMembersMetrics.execute(input)
  }

  async getRecentOrganizationRequests(
    organizationId: string,
    limit?: number
  ): Promise<RecentOrganizationRequest[]> {
    const useCases = await this.getUseCases()
    return await useCases.getRecentOrganizationRequests.execute(organizationId, limit)
  }

  private async getUseCases(): Promise<MetricsUseCaseContainer> {
    return this.injectedUseCases ?? (await getMetricsUseCases())
  }
}

export const metricsApplicationService = new MetricsApplicationService()
