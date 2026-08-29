export const COMBINED_ORGANIZATION_METRICS_QUERY = `
  query CombinedOrganizationMetrics($slug: String!, $summaryDays: Int = 30, $dailyDays: Int = 30) {
    organizationMetricsSummary(slug: $slug, days: $summaryDays) {
      totalRequests
      totalNewVisitors
      totalQuotes
      totalInvoices
      totalRevenue
      averageDailyRequests
      averageDailyNewVisitors
      averageDailyRevenue
      periodDays
    }
    organizationDailyMetrics(slug: $slug, days: $dailyDays) {
      date
      requestsReceived
      newVisitors
      quotesGenerated
      invoicesCreated
      revenue
    }
  }
`

export const COMBINED_MEMBER_METRICS_QUERY = `
  query CombinedMemberMetrics($userId: String!, $organizationSlug: String!, $days: Int = 30) {
    memberMetricsSummary(userId: $userId, organizationSlug: $organizationSlug, days: $days) {
      requestsHandled
      quotesCreated
      invoicesCreated
      totalRevenue
      conversationsCount
      messagesCount
      averageDailyRequests
      averageDailyRevenue
      periodDays
    }
    memberDailyMetrics(userId: $userId, organizationSlug: $organizationSlug, days: $days) {
      date
      requestsHandled
      quotesCreated
      invoicesCreated
      revenue
      messagesCount
    }
  }
`
