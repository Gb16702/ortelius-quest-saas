import { GraphQLError } from 'graphql'
import type { GraphQLContext } from '../../../../infrastructure/graphql/graphql.context'
import { organizationApplicationService } from '../../../organization/organization.application'
import { requestsApplicationService } from '../../../requests/requests.application'
import type {
  MemberMetricsResponse,
  MemberMetricsSummary,
  MetricsResponse,
  OrganizationMetricsSummary,
} from '../../domain/metrics-models'
import { metricsApplicationService } from '../../metrics.application'
import {
  canAccessMemberMetrics,
  requireOrganizationAdmin,
  requireOrganizationMember,
} from './graphql.guards'

export const metricsResolvers = {
  Query: {
    organizationMetrics: async (
      _parent: unknown,
      args: { slug: string; days?: number },
      context: GraphQLContext
    ): Promise<MetricsResponse> => {
      const { slug, days = 30 } = args

      const organization = await organizationApplicationService.getBySlug(slug)
      if (!organization) {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      await requireOrganizationMember(context, organization.id)

      return await metricsApplicationService.getOrganizationMetricsResponse(organization, days)
    },

    organizationMetricsSummary: async (
      _parent: unknown,
      args: { slug: string; days?: number },
      context: GraphQLContext
    ): Promise<OrganizationMetricsSummary> => {
      const { slug, days = 30 } = args

      const organization = await organizationApplicationService.getBySlug(slug)
      if (!organization) {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      await requireOrganizationMember(context, organization.id)

      return await metricsApplicationService.getOrganizationMetricsSummary(organization.id, days)
    },

    organizationDailyMetrics: async (
      _parent: unknown,
      args: { slug: string; days?: number },
      context: GraphQLContext
    ) => {
      const { slug, days = 30 } = args

      const organization = await organizationApplicationService.getBySlug(slug)
      if (!organization) {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      await requireOrganizationMember(context, organization.id)

      return await metricsApplicationService.getOrganizationDailyMetrics(organization.id, days)
    },

    memberMetrics: async (
      _parent: unknown,
      args: { userId: string; organizationSlug: string; days?: number },
      context: GraphQLContext
    ): Promise<MemberMetricsResponse> => {
      const { userId, organizationSlug, days = 30 } = args

      const organization = await organizationApplicationService.getBySlug(organizationSlug)
      if (!organization) {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      await canAccessMemberMetrics(context, userId, organization.id)

      try {
        return await metricsApplicationService.getMemberMetricsResponse({
          userId,
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug!,
          },
          days,
        })
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'User not found') {
          throw error
        }
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }
    },

    memberMetricsSummary: async (
      _parent: unknown,
      args: { userId: string; organizationSlug: string; days?: number },
      context: GraphQLContext
    ): Promise<MemberMetricsSummary> => {
      const { userId, organizationSlug, days = 30 } = args

      const organization = await organizationApplicationService.getBySlug(organizationSlug)
      if (!organization) {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      await canAccessMemberMetrics(context, userId, organization.id)

      return await metricsApplicationService.getMemberMetricsSummary(userId, organization.id, days)
    },

    memberDailyMetrics: async (
      _parent: unknown,
      args: { userId: string; organizationSlug: string; days?: number },
      context: GraphQLContext
    ) => {
      const { userId, organizationSlug, days = 30 } = args

      const organization = await organizationApplicationService.getBySlug(organizationSlug)
      if (!organization) {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      await canAccessMemberMetrics(context, userId, organization.id)

      return await metricsApplicationService.getMemberDailyMetrics(userId, organization.id, days)
    },

    organizationMembersList: async (
      _parent: unknown,
      args: { organizationSlug: string; days?: number },
      context: GraphQLContext
    ): Promise<MemberMetricsResponse[]> => {
      const { organizationSlug, days = 30 } = args

      const organization = await organizationApplicationService.getBySlug(organizationSlug)
      if (!organization) {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      await requireOrganizationAdmin(context, organization.id)

      return await metricsApplicationService.listOrganizationMembersMetrics({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug!,
        },
        days,
      })
    },

    recentOrganizationRequests: async (
      _parent: unknown,
      args: { organizationSlug: string; limit?: number },
      context: GraphQLContext
    ) => {
      const { organizationSlug, limit = 5 } = args

      const organization = await organizationApplicationService.getBySlug(organizationSlug)
      if (!organization) {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      await requireOrganizationMember(context, organization.id)

      return await metricsApplicationService.getRecentOrganizationRequests(organization.id, limit)
    },

    organizationRequestsAggregation: async (
      _parent: unknown,
      args: { organizationSlug: string; days?: number },
      context: GraphQLContext
    ) => {
      const { organizationSlug } = args

      const organization = await organizationApplicationService.getBySlug(organizationSlug)
      if (!organization) {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      await requireOrganizationMember(context, organization.id)

      return await requestsApplicationService.getOrganizationRequestsAggregation(organization.id)
    },
  },
}
