import {
  buildOrganizationDashboard,
  buildOrganizationMembersPage,
  normalizeOrganizationMemberFilters,
  type OrganizationDashboard,
  type OrganizationMemberFilterOptions,
  type OrganizationMembersPage,
} from '../domain'
import { OrganizationNotFoundError, OrganizationPermissionError } from './organization-errors'
import type {
  OrganizationDashboardQueryPort,
  OrganizationMemberQueryPort,
  OrganizationMembershipQueryPort,
} from './ports'

export class GetOrganizationDashboardUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly dashboard: OrganizationDashboardQueryPort,
    private readonly members: OrganizationMemberQueryPort
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    filters?: OrganizationMemberFilterOptions
  }): Promise<OrganizationDashboard> {
    const membership = await this.memberships.findMembership(
      command.actorId,
      command.organizationId
    )
    if (!membership) {
      throw new OrganizationPermissionError('User is not a member of this organization')
    }

    const normalizedFilters = normalizeOrganizationMemberFilters(command.filters)
    const [organization, members, totalMembers, metrics] = await Promise.all([
      this.dashboard.findDashboardOrganization(command.organizationId),
      this.members.listMembersForDashboard(command.organizationId, normalizedFilters),
      this.members.countMembers(command.organizationId, normalizedFilters),
      this.dashboard.getDashboardMetrics(command.organizationId),
    ])

    if (!organization) {
      throw new OrganizationNotFoundError()
    }

    return buildOrganizationDashboard({
      organization,
      members,
      totalMembers,
      userRole: membership.role,
      metrics,
      page: normalizedFilters.page,
      limit: normalizedFilters.limit,
    })
  }
}

export class ListOrganizationMembersUseCase {
  constructor(
    private readonly memberships: OrganizationMembershipQueryPort,
    private readonly members: OrganizationMemberQueryPort
  ) {}

  async execute(command: {
    organizationId: string
    actorId: string
    filters?: OrganizationMemberFilterOptions
  }): Promise<OrganizationMembersPage> {
    const membership = await this.memberships.findMembership(
      command.actorId,
      command.organizationId
    )
    if (!membership) {
      throw new OrganizationPermissionError('User is not a member of this organization')
    }

    const normalizedFilters = normalizeOrganizationMemberFilters(command.filters)
    const [members, total] = await Promise.all([
      this.members.listMembersPage(command.organizationId, normalizedFilters),
      this.members.countMembers(command.organizationId, normalizedFilters),
    ])

    return buildOrganizationMembersPage({
      members,
      total,
      page: normalizedFilters.page,
      limit: normalizedFilters.limit,
      userRole: membership.role,
    })
  }
}
