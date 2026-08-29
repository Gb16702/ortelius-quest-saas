import { describe, expect, it } from 'bun:test'
import type {
  MemberDailyMetrics,
  MemberMetrics,
  OrganizationDailyMetrics,
  OrganizationMetrics,
} from '../domain/metrics-models'
import {
  completeMemberDailyMetrics,
  completeOrganizationDailyMetrics,
  summarizeMemberMetrics,
  summarizeOrganizationMetrics,
} from '../domain/metrics-time-series'

describe('Metrics domain time series', () => {
  it('fills missing organization daily metrics without infrastructure dependencies', () => {
    const startDate = new Date('2026-05-01T00:00:00.000Z')
    const endDate = new Date('2026-05-03T00:00:00.000Z')
    const existing: OrganizationDailyMetrics[] = [
      {
        id: 'metric-2',
        organizationId: 'org-1',
        date: new Date('2026-05-02T00:00:00.000Z'),
        requestsReceived: 4,
        newVisitors: 2,
        quotesGenerated: 1,
        invoicesCreated: 1,
        revenue: '25.5',
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
      },
    ]

    const result = completeOrganizationDailyMetrics('org-1', existing, startDate, endDate, 3)

    expect(result).toHaveLength(3)
    expect(result.map((metric) => metric.requestsReceived)).toEqual([0, 4, 0])
    expect(result[0].id).toStartWith('empty-org-1-')
    expect(result[1]).toBe(existing[0])
  })

  it('aggregates member metrics by week for long ranges', () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z')
    const endDate = new Date('2026-05-07T00:00:00.000Z')
    const existing: MemberDailyMetrics[] = [
      memberDailyMetric('2026-01-05T00:00:00.000Z', { requestsHandled: 2, revenue: '10' }),
      memberDailyMetric('2026-01-06T00:00:00.000Z', { requestsHandled: 3, revenue: '12.5' }),
    ]

    const result = completeMemberDailyMetrics('user-1', 'org-1', existing, startDate, endDate, 120)
    const populatedWeek = result.find((metric) => metric.requestsHandled === 5)

    expect(populatedWeek).toMatchObject({
      userId: 'user-1',
      organizationId: 'org-1',
      requestsHandled: 5,
      revenue: '22.5',
    })
  })

  it('summarizes organization and member metrics from completed daily rows', () => {
    const organizationSummary = summarizeOrganizationMetrics(
      organizationMetrics(),
      [
        organizationDailyMetric({ requestsReceived: 2, newVisitors: 3, revenue: '9' }),
        organizationDailyMetric({ requestsReceived: 4, newVisitors: 1, revenue: '15' }),
      ],
      2
    )
    const memberSummary = summarizeMemberMetrics(
      memberMetrics(),
      [
        memberDailyMetric('2026-05-01T00:00:00.000Z', {
          requestsHandled: 1,
          revenue: '5',
        }),
        memberDailyMetric('2026-05-02T00:00:00.000Z', {
          requestsHandled: 3,
          revenue: '7',
        }),
      ],
      2
    )

    expect(organizationSummary).toMatchObject({
      totalRequests: 10,
      averageDailyRequests: 3,
      averageDailyRevenue: 12,
    })
    expect(memberSummary).toMatchObject({
      requestsHandled: 6,
      averageDailyRequests: 2,
      averageDailyRevenue: 6,
    })
  })
})

function organizationMetrics(): OrganizationMetrics {
  return {
    id: 'metrics-1',
    organizationId: 'org-1',
    totalRequestsReceived: 10,
    totalNewVisitors: 20,
    totalQuotesGenerated: 3,
    totalInvoicesCreated: 2,
    totalRevenue: '100',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  }
}

function organizationDailyMetric(
  overrides: Partial<OrganizationDailyMetrics>
): OrganizationDailyMetrics {
  return {
    id: 'daily-1',
    organizationId: 'org-1',
    date: new Date('2026-05-01T00:00:00.000Z'),
    requestsReceived: 0,
    newVisitors: 0,
    quotesGenerated: 0,
    invoicesCreated: 0,
    revenue: '0',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  }
}

function memberMetrics(): MemberMetrics {
  return {
    id: 'member-metrics-1',
    userId: 'user-1',
    organizationId: 'org-1',
    requestsHandled: 6,
    quotesCreated: 2,
    invoicesCreated: 1,
    totalRevenue: '45',
    conversationsCount: 4,
    messagesCount: 9,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  }
}

function memberDailyMetric(
  date: string,
  overrides: Partial<MemberDailyMetrics>
): MemberDailyMetrics {
  return {
    id: `member-daily-${date}`,
    userId: 'user-1',
    organizationId: 'org-1',
    date: new Date(date),
    requestsHandled: 0,
    quotesCreated: 0,
    invoicesCreated: 0,
    revenue: '0',
    messagesCount: 0,
    createdAt: new Date(date),
    ...overrides,
  }
}
