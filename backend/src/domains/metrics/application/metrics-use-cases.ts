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
} from '../domain/metrics-models'
import { summarizeMemberMetrics, summarizeOrganizationMetrics } from '../domain/metrics-time-series'
import type { MetricsRecentRequestsQuery, MetricsRepository, MetricsUserDirectory } from './ports'

export interface OrganizationMetricsDescriptor {
  id: string
  name: string
  slug: string | null
}

export class RecordOrganizationRequestMetricUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(organizationId: string): Promise<void> {
    await this.metrics.incrementRequestMetric(organizationId)
  }
}

export class RecordNewVisitorMetricUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(organizationId: string, visitorHash: string): Promise<void> {
    await this.metrics.incrementNewVisitorMetric(organizationId, visitorHash)
  }
}

export class RecordQuoteMetricUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(organizationId: string, revenue?: number): Promise<void> {
    await this.metrics.incrementQuoteMetric(organizationId, revenue)
  }
}

export class RecordInvoiceMetricUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(organizationId: string, revenue?: number): Promise<void> {
    await this.metrics.incrementInvoiceMetric(organizationId, revenue)
  }
}

export class RecordMemberRequestMetricUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(userId: string, organizationId: string): Promise<void> {
    await this.metrics.incrementMemberRequest(userId, organizationId)
  }
}

export class RecordMemberQuoteMetricUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(userId: string, organizationId: string, revenue?: number): Promise<void> {
    await this.metrics.incrementMemberQuote(userId, organizationId, revenue)
  }
}

export class RecordMemberInvoiceMetricUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(userId: string, organizationId: string, revenue?: number): Promise<void> {
    await this.metrics.incrementMemberInvoice(userId, organizationId, revenue)
  }
}

export class RecordMemberConversationMetricUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(userId: string, organizationId: string): Promise<void> {
    await this.metrics.incrementMemberConversation(userId, organizationId)
  }
}

export class RecordMemberMessageMetricUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(userId: string, organizationId: string): Promise<void> {
    await this.metrics.incrementMemberMessage(userId, organizationId)
  }
}

export class GetOrganizationMetricsUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(organizationId: string): Promise<OrganizationMetrics | null> {
    return await this.metrics.getOrganizationMetrics(organizationId)
  }
}

export class GetOrganizationDailyMetricsUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(organizationId: string, days?: number): Promise<OrganizationDailyMetrics[]> {
    return await this.metrics.getOrganizationDailyMetrics(organizationId, days)
  }
}

export class GetOrganizationMetricsResponseUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(organization: OrganizationMetricsDescriptor, days = 30): Promise<MetricsResponse> {
    const [metrics, dailyMetrics] = await Promise.all([
      this.metrics.getOrganizationMetrics(organization.id),
      this.metrics.getOrganizationDailyMetrics(organization.id, days),
    ])

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      metrics,
      dailyMetrics,
    }
  }
}

export class GetOrganizationMetricsSummaryUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(organizationId: string, days = 30): Promise<OrganizationMetricsSummary> {
    const [metrics, dailyMetrics] = await Promise.all([
      this.metrics.getOrganizationMetrics(organizationId),
      this.metrics.getOrganizationDailyMetrics(organizationId, days),
    ])

    return summarizeOrganizationMetrics(metrics, dailyMetrics, days)
  }
}

export class GetMemberMetricsUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(userId: string, organizationId: string): Promise<MemberMetrics | null> {
    return await this.metrics.getMemberMetrics(userId, organizationId)
  }
}

export class GetAllMembersMetricsUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(organizationId: string): Promise<MemberMetrics[]> {
    return await this.metrics.getAllMembersMetrics(organizationId)
  }
}

export class GetMemberDailyMetricsUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(
    userId: string,
    organizationId: string,
    days?: number
  ): Promise<MemberDailyMetrics[]> {
    return await this.metrics.getMemberDailyMetrics(userId, organizationId, days)
  }
}

export class GetMemberMetricsResponseUseCase {
  constructor(
    private readonly metrics: MetricsRepository,
    private readonly users: MetricsUserDirectory
  ) {}

  async execute(input: {
    userId: string
    organization: OrganizationMetricsDescriptor & { slug: string }
    days?: number
  }): Promise<MemberMetricsResponse> {
    const user = await this.users.getUserById(input.userId)
    if (!user) {
      throw new Error('User not found')
    }

    const [metrics, dailyMetrics] = await Promise.all([
      this.metrics.getMemberMetrics(input.userId, input.organization.id),
      this.metrics.getMemberDailyMetrics(input.userId, input.organization.id, input.days),
    ])

    return {
      member: user,
      organization: input.organization,
      metrics,
      dailyMetrics,
    }
  }
}

export class GetMemberMetricsSummaryUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute(userId: string, organizationId: string, days = 30): Promise<MemberMetricsSummary> {
    const [metrics, dailyMetrics] = await Promise.all([
      this.metrics.getMemberMetrics(userId, organizationId),
      this.metrics.getMemberDailyMetrics(userId, organizationId, days),
    ])

    return summarizeMemberMetrics(metrics, dailyMetrics, days)
  }
}

export class ListOrganizationMembersMetricsUseCase {
  constructor(
    private readonly metrics: MetricsRepository,
    private readonly users: MetricsUserDirectory
  ) {}

  async execute(input: {
    organization: OrganizationMetricsDescriptor & { slug: string }
    days?: number
  }): Promise<MemberMetricsResponse[]> {
    const allMembersMetrics = await this.metrics.getAllMembersMetrics(input.organization.id)
    const results: MemberMetricsResponse[] = []

    for (const memberMetric of allMembersMetrics) {
      const user = await this.users.getUserById(memberMetric.userId)
      if (!user) continue

      const dailyMetrics = await this.metrics.getMemberDailyMetrics(
        memberMetric.userId,
        input.organization.id,
        input.days
      )

      results.push({
        member: user,
        organization: input.organization,
        metrics: memberMetric,
        dailyMetrics,
      })
    }

    return results
  }
}

export class GetRecentOrganizationRequestsUseCase {
  constructor(private readonly requests: MetricsRecentRequestsQuery) {}

  async execute(organizationId: string, limit = 5): Promise<RecentOrganizationRequest[]> {
    return await this.requests.getRecentOrganizationRequests(organizationId, limit)
  }
}
