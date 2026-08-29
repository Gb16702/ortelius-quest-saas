import {
  GetAllMembersMetricsUseCase,
  GetMemberDailyMetricsUseCase,
  GetMemberMetricsResponseUseCase,
  GetMemberMetricsSummaryUseCase,
  GetMemberMetricsUseCase,
  GetOrganizationDailyMetricsUseCase,
  GetOrganizationMetricsResponseUseCase,
  GetOrganizationMetricsSummaryUseCase,
  GetOrganizationMetricsUseCase,
  GetRecentOrganizationRequestsUseCase,
  ListOrganizationMembersMetricsUseCase,
  RecordInvoiceMetricUseCase,
  RecordMemberConversationMetricUseCase,
  RecordMemberInvoiceMetricUseCase,
  RecordMemberMessageMetricUseCase,
  RecordMemberQuoteMetricUseCase,
  RecordMemberRequestMetricUseCase,
  RecordNewVisitorMetricUseCase,
  RecordOrganizationRequestMetricUseCase,
  RecordQuoteMetricUseCase,
} from '../application/metrics-use-cases'

export interface MetricsUseCaseContainer {
  getMemberDailyMetrics: GetMemberDailyMetricsUseCase
  getAllMembersMetrics: GetAllMembersMetricsUseCase
  getMemberMetrics: GetMemberMetricsUseCase
  getMemberMetricsResponse: GetMemberMetricsResponseUseCase
  getMemberMetricsSummary: GetMemberMetricsSummaryUseCase
  getOrganizationDailyMetrics: GetOrganizationDailyMetricsUseCase
  getOrganizationMetrics: GetOrganizationMetricsUseCase
  getOrganizationMetricsResponse: GetOrganizationMetricsResponseUseCase
  getOrganizationMetricsSummary: GetOrganizationMetricsSummaryUseCase
  getRecentOrganizationRequests: GetRecentOrganizationRequestsUseCase
  listOrganizationMembersMetrics: ListOrganizationMembersMetricsUseCase
  recordInvoiceMetric: RecordInvoiceMetricUseCase
  recordMemberConversationMetric: RecordMemberConversationMetricUseCase
  recordMemberInvoiceMetric: RecordMemberInvoiceMetricUseCase
  recordMemberMessageMetric: RecordMemberMessageMetricUseCase
  recordMemberQuoteMetric: RecordMemberQuoteMetricUseCase
  recordMemberRequestMetric: RecordMemberRequestMetricUseCase
  recordOrganizationRequestMetric: RecordOrganizationRequestMetricUseCase
  recordQuoteMetric: RecordQuoteMetricUseCase
  recordNewVisitorMetric: RecordNewVisitorMetricUseCase
}

let metricsUseCases: MetricsUseCaseContainer | null = null

export async function getMetricsUseCases(): Promise<MetricsUseCaseContainer> {
  if (metricsUseCases) return metricsUseCases

  const { metricsRepository } = await import('./drizzle-metrics.repository')

  metricsUseCases = {
    getMemberDailyMetrics: new GetMemberDailyMetricsUseCase(metricsRepository),
    getAllMembersMetrics: new GetAllMembersMetricsUseCase(metricsRepository),
    getMemberMetrics: new GetMemberMetricsUseCase(metricsRepository),
    getMemberMetricsResponse: new GetMemberMetricsResponseUseCase(
      metricsRepository,
      metricsRepository
    ),
    getMemberMetricsSummary: new GetMemberMetricsSummaryUseCase(metricsRepository),
    getOrganizationDailyMetrics: new GetOrganizationDailyMetricsUseCase(metricsRepository),
    getOrganizationMetrics: new GetOrganizationMetricsUseCase(metricsRepository),
    getOrganizationMetricsResponse: new GetOrganizationMetricsResponseUseCase(metricsRepository),
    getOrganizationMetricsSummary: new GetOrganizationMetricsSummaryUseCase(metricsRepository),
    getRecentOrganizationRequests: new GetRecentOrganizationRequestsUseCase(metricsRepository),
    listOrganizationMembersMetrics: new ListOrganizationMembersMetricsUseCase(
      metricsRepository,
      metricsRepository
    ),
    recordInvoiceMetric: new RecordInvoiceMetricUseCase(metricsRepository),
    recordMemberConversationMetric: new RecordMemberConversationMetricUseCase(metricsRepository),
    recordMemberInvoiceMetric: new RecordMemberInvoiceMetricUseCase(metricsRepository),
    recordMemberMessageMetric: new RecordMemberMessageMetricUseCase(metricsRepository),
    recordMemberQuoteMetric: new RecordMemberQuoteMetricUseCase(metricsRepository),
    recordMemberRequestMetric: new RecordMemberRequestMetricUseCase(metricsRepository),
    recordOrganizationRequestMetric: new RecordOrganizationRequestMetricUseCase(metricsRepository),
    recordQuoteMetric: new RecordQuoteMetricUseCase(metricsRepository),
    recordNewVisitorMetric: new RecordNewVisitorMetricUseCase(metricsRepository),
  }

  return metricsUseCases
}
