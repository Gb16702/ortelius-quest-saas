export const metricsTypeDefs = /* GraphQL */ `
  type OrganizationInfo {
    id: String!
    name: String!
    slug: String!
  }

  type MemberInfo {
    id: String!
    name: String!
    email: String!
  }

  type OrganizationMetrics {
    id: String!
    organizationId: String!
    totalRequestsReceived: Int!
    totalNewVisitors: Int!
    totalQuotesGenerated: Int!
    totalInvoicesCreated: Int!
    totalRevenue: Float!
    updatedAt: String!
    createdAt: String!
  }

  type OrganizationDailyMetrics {
    id: String!
    organizationId: String!
    date: String!
    requestsReceived: Int!
    newVisitors: Int!
    quotesGenerated: Int!
    invoicesCreated: Int!
    revenue: Float!
    createdAt: String!
  }

  type OrganizationMetricsResponse {
    organization: OrganizationInfo!
    metrics: OrganizationMetrics
    dailyMetrics: [OrganizationDailyMetrics!]!
  }

  type OrganizationMetricsSummary {
    totalRequests: Int!
    totalNewVisitors: Int!
    totalQuotes: Int!
    totalInvoices: Int!
    totalRevenue: Float!
    averageDailyRequests: Float!
    averageDailyNewVisitors: Float!
    averageDailyRevenue: Float!
    periodDays: Int!
  }

  type MemberMetrics {
    id: String!
    userId: String!
    organizationId: String!
    requestsHandled: Int!
    quotesCreated: Int!
    invoicesCreated: Int!
    totalRevenue: Float!
    conversationsCount: Int!
    messagesCount: Int!
    updatedAt: String!
    createdAt: String!
  }

  type MemberDailyMetrics {
    id: String!
    userId: String!
    organizationId: String!
    date: String!
    requestsHandled: Int!
    quotesCreated: Int!
    invoicesCreated: Int!
    revenue: Float!
    messagesCount: Int!
    createdAt: String!
  }

  type MemberMetricsResponse {
    member: MemberInfo!
    organization: OrganizationInfo!
    metrics: MemberMetrics
    dailyMetrics: [MemberDailyMetrics!]!
  }

  type MemberMetricsSummary {
    requestsHandled: Int!
    quotesCreated: Int!
    invoicesCreated: Int!
    totalRevenue: Float!
    conversationsCount: Int!
    messagesCount: Int!
    averageDailyRequests: Float!
    averageDailyRevenue: Float!
    periodDays: Int!
  }

  type RequesterInfo {
    id: String
    name: String!
    email: String!
    image: String
  }

  type RecentRequest {
    id: String!
    reqNumber: String!
    lifecycleStatus: String!
    closedReason: String
    requester: RequesterInfo!
    createdAt: String!
  }

  type ServiceCargoAggregation {
    id: String!
    name: String!
    count: Int!
    percentage: Float!
  }

  type OrganizationRequestsAggregation {
    services: [ServiceCargoAggregation!]!
    cargoTypes: [ServiceCargoAggregation!]!
  }

  type Query {
    organizationMetrics(slug: String!, days: Int = 30): OrganizationMetricsResponse
    organizationMetricsSummary(slug: String!, days: Int = 30): OrganizationMetricsSummary
    organizationDailyMetrics(slug: String!, days: Int = 30): [OrganizationDailyMetrics!]!

    memberMetrics(userId: String!, organizationSlug: String!, days: Int = 30): MemberMetricsResponse
    memberMetricsSummary(userId: String!, organizationSlug: String!, days: Int = 30): MemberMetricsSummary
    memberDailyMetrics(userId: String!, organizationSlug: String!, days: Int = 30): [MemberDailyMetrics!]!

    organizationMembersList(organizationSlug: String!, days: Int = 30): [MemberMetricsResponse!]!
    recentOrganizationRequests(organizationSlug: String!, limit: Int = 5): [RecentRequest!]!
    organizationRequestsAggregation(organizationSlug: String!, days: Int = 30): OrganizationRequestsAggregation!
  }
`
