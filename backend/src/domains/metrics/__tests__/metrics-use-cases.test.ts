import { describe, expect, it } from 'bun:test'
import {
  GetMemberMetricsResponseUseCase,
  GetOrganizationMetricsResponseUseCase,
  GetRecentOrganizationRequestsUseCase,
  RecordQuoteMetricUseCase,
} from '../application/metrics-use-cases'
import type {
  MetricsRecentRequestsQuery,
  MetricsRepository,
  MetricsUserDirectory,
} from '../application/ports'
import type {
  MemberDailyMetrics,
  MemberMetrics,
  MetricsUser,
  OrganizationDailyMetrics,
  OrganizationMetrics,
  RecentOrganizationRequest,
} from '../domain/metrics-models'

describe('Metrics use cases', () => {
  it('builds an organization metrics response through the repository port', async () => {
    const repository = new InMemoryMetricsRepository()
    const useCase = new GetOrganizationMetricsResponseUseCase(repository)

    const response = await useCase.execute({
      id: 'org-1',
      name: 'Ortelius',
      slug: 'ortelius',
    })

    expect(response.organization).toEqual({
      id: 'org-1',
      name: 'Ortelius',
      slug: 'ortelius',
    })
    expect(response.metrics?.totalRequestsReceived).toBe(3)
    expect(response.dailyMetrics).toHaveLength(1)
  })

  it('records quote metrics through the write port', async () => {
    const repository = new InMemoryMetricsRepository()
    const useCase = new RecordQuoteMetricUseCase(repository)

    await useCase.execute('org-1', 42)

    expect(repository.recordedQuotes).toEqual([{ organizationId: 'org-1', revenue: 42 }])
  })

  it('builds a member metrics response through user and metrics ports', async () => {
    const repository = new InMemoryMetricsRepository()
    const users = new InMemoryUserDirectory()
    const useCase = new GetMemberMetricsResponseUseCase(repository, users)

    const response = await useCase.execute({
      userId: 'user-1',
      organization: { id: 'org-1', name: 'Ortelius', slug: 'ortelius' },
      days: 7,
    })

    expect(response.member.email).toBe('user@example.com')
    expect(response.metrics?.requestsHandled).toBe(2)
    expect(response.dailyMetrics[0].requestsHandled).toBe(1)
  })

  it('delegates recent requests to the query port', async () => {
    const requests = new InMemoryRecentRequestsQuery()
    const useCase = new GetRecentOrganizationRequestsUseCase(requests)

    const result = await useCase.execute('org-1', 5)

    expect(result).toEqual(requests.recentRequests)
  })
})

class InMemoryMetricsRepository implements MetricsRepository {
  recordedQuotes: Array<{ organizationId: string; revenue?: number }> = []

  async incrementRequestMetric(): Promise<void> {}
  async incrementNewVisitorMetric(): Promise<void> {}
  async incrementInvoiceMetric(): Promise<void> {}
  async incrementMemberRequest(): Promise<void> {}
  async incrementMemberQuote(): Promise<void> {}
  async incrementMemberInvoice(): Promise<void> {}
  async incrementMemberConversation(): Promise<void> {}
  async incrementMemberMessage(): Promise<void> {}

  async incrementQuoteMetric(organizationId: string, revenue?: number): Promise<void> {
    this.recordedQuotes.push({ organizationId, revenue })
  }

  async getOrganizationMetrics(): Promise<OrganizationMetrics | null> {
    return {
      id: 'metrics-1',
      organizationId: 'org-1',
      totalRequestsReceived: 3,
      totalNewVisitors: 4,
      totalQuotesGenerated: 1,
      totalInvoicesCreated: 0,
      totalRevenue: '42',
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    }
  }

  async getOrganizationDailyMetrics(): Promise<OrganizationDailyMetrics[]> {
    return [
      {
        id: 'daily-1',
        organizationId: 'org-1',
        date: new Date('2026-05-01T00:00:00.000Z'),
        requestsReceived: 3,
        newVisitors: 4,
        quotesGenerated: 1,
        invoicesCreated: 0,
        revenue: '42',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]
  }

  async getMemberMetrics(): Promise<MemberMetrics | null> {
    return {
      id: 'member-metrics-1',
      userId: 'user-1',
      organizationId: 'org-1',
      requestsHandled: 2,
      quotesCreated: 1,
      invoicesCreated: 0,
      totalRevenue: '42',
      conversationsCount: 0,
      messagesCount: 3,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    }
  }

  async getMemberDailyMetrics(): Promise<MemberDailyMetrics[]> {
    return [
      {
        id: 'member-daily-1',
        userId: 'user-1',
        organizationId: 'org-1',
        date: new Date('2026-05-01T00:00:00.000Z'),
        requestsHandled: 1,
        quotesCreated: 1,
        invoicesCreated: 0,
        revenue: '42',
        messagesCount: 3,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]
  }

  async getAllMembersMetrics(): Promise<MemberMetrics[]> {
    const metrics = await this.getMemberMetrics()
    return metrics ? [metrics] : []
  }
}

class InMemoryUserDirectory implements MetricsUserDirectory {
  async getUserById(): Promise<MetricsUser | null> {
    return {
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
    }
  }
}

class InMemoryRecentRequestsQuery implements MetricsRecentRequestsQuery {
  recentRequests: RecentOrganizationRequest[] = [
    {
      id: 'req-1',
      reqNumber: 'REQ-1',
      status: 'pending',
      requester: {
        id: 'user-1',
        name: 'Requester',
        email: 'requester@example.com',
        image: null,
      },
      createdAt: '2026-05-01T00:00:00.000Z',
    },
  ]

  async getRecentOrganizationRequests(): Promise<RecentOrganizationRequest[]> {
    return this.recentRequests
  }
}
