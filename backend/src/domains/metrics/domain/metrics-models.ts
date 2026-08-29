export interface OrganizationMetrics {
  id: string
  organizationId: string
  totalRequestsReceived: number
  totalNewVisitors: number
  totalQuotesGenerated: number
  totalInvoicesCreated: number
  totalRevenue: string
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationDailyMetrics {
  id: string
  organizationId: string
  date: Date
  requestsReceived: number
  newVisitors: number
  quotesGenerated: number
  invoicesCreated: number
  revenue: string
  createdAt: Date
  updatedAt?: Date
}

export interface MetricsResponse {
  organization: {
    id: string
    name: string
    slug: string | null
  }
  metrics: OrganizationMetrics | null
  dailyMetrics: OrganizationDailyMetrics[]
}

export interface MemberMetrics {
  id: string
  userId: string
  organizationId: string
  requestsHandled: number
  quotesCreated: number
  invoicesCreated: number
  totalRevenue: string
  conversationsCount: number
  messagesCount: number
  createdAt: Date
  updatedAt: Date
}

export interface MemberDailyMetrics {
  id: string
  userId: string
  organizationId: string
  date: Date
  requestsHandled: number
  quotesCreated: number
  invoicesCreated: number
  revenue: string
  messagesCount: number
  createdAt: Date
  updatedAt?: Date
}

export interface MemberMetricsResponse {
  member: {
    id: string
    name: string
    email: string
  }
  organization: {
    id: string
    name: string
    slug: string
  }
  metrics: MemberMetrics | null
  dailyMetrics: MemberDailyMetrics[]
}

export interface OrganizationMetricsSummary {
  totalRequests: number
  totalNewVisitors: number
  totalQuotes: number
  totalInvoices: number
  totalRevenue: number
  averageDailyRequests: number
  averageDailyNewVisitors: number
  averageDailyRevenue: number
  periodDays: number
}

export interface MemberMetricsSummary {
  requestsHandled: number
  quotesCreated: number
  invoicesCreated: number
  totalRevenue: number
  conversationsCount: number
  messagesCount: number
  averageDailyRequests: number
  averageDailyRevenue: number
  periodDays: number
}

export interface MetricsUser {
  id: string
  name: string
  email: string
}

export interface RecentOrganizationRequest {
  id: string
  reqNumber: string
  lifecycleStatus: string
  closedReason: string | null
  requester: {
    id: string | null
    name: string
    email: string
    image: string | null
  }
  createdAt: string
}
