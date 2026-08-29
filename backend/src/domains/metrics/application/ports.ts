import type {
  MemberDailyMetrics,
  MemberMetrics,
  MetricsUser,
  OrganizationDailyMetrics,
  OrganizationMetrics,
  RecentOrganizationRequest,
} from '../domain/metrics-models'

export interface MetricsRepository {
  incrementRequestMetric(organizationId: string): Promise<void>
  incrementNewVisitorMetric(organizationId: string, visitorHash: string): Promise<void>
  incrementQuoteMetric(organizationId: string, revenue?: number): Promise<void>
  incrementInvoiceMetric(organizationId: string, revenue?: number): Promise<void>
  getOrganizationMetrics(organizationId: string): Promise<OrganizationMetrics | null>
  getOrganizationDailyMetrics(
    organizationId: string,
    days?: number
  ): Promise<OrganizationDailyMetrics[]>
  incrementMemberRequest(userId: string, organizationId: string): Promise<void>
  incrementMemberQuote(userId: string, organizationId: string, revenue?: number): Promise<void>
  incrementMemberInvoice(userId: string, organizationId: string, revenue?: number): Promise<void>
  incrementMemberConversation(userId: string, organizationId: string): Promise<void>
  incrementMemberMessage(userId: string, organizationId: string): Promise<void>
  getMemberMetrics(userId: string, organizationId: string): Promise<MemberMetrics | null>
  getMemberDailyMetrics(
    userId: string,
    organizationId: string,
    days?: number
  ): Promise<MemberDailyMetrics[]>
  getAllMembersMetrics(organizationId: string): Promise<MemberMetrics[]>
}

export interface MetricsUserDirectory {
  getUserById(userId: string): Promise<MetricsUser | null>
}

export interface MetricsRecentRequestsQuery {
  getRecentOrganizationRequests(
    organizationId: string,
    limit: number
  ): Promise<RecentOrganizationRequest[]>
}
