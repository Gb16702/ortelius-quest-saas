import { describe, expect, it, mock } from 'bun:test'
import {
  GetOrganizationDashboardUseCase,
  ListOrganizationMembersUseCase,
} from '../application/organization-member-queries.use-cases'
import type {
  OrganizationDashboardQueryPort,
  OrganizationMemberQueryPort,
  OrganizationMembershipQueryPort,
} from '../application/ports'

function createMemberships(role: string | null): OrganizationMembershipQueryPort {
  return {
    findMembership: mock(async () =>
      role
        ? {
            id: 'member-1',
            role,
            organizationId: 'org-1',
            userId: 'user-1',
          }
        : null
    ),
  }
}

function createMemberQueries(): OrganizationMemberQueryPort {
  return {
    countMembers: mock(async () => 23),
    listMembersForDashboard: mock(async () => [createMember('owner')]),
    listMembersPage: mock(async () => [createMember('admin')]),
  }
}

function createDashboardQuery(): OrganizationDashboardQueryPort {
  return {
    findDashboardOrganization: mock(async () => ({
      id: 'org-1',
      name: 'Ortelius',
      slug: 'ortelius',
      logo: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })),
    getDashboardMetrics: mock(async () => ({
      totalRequestsReceived: 12,
      totalNewVisitors: 34,
    })),
  }
}

function createMember(role: string) {
  return {
    id: `member-${role}`,
    organizationId: 'org-1',
    userId: `user-${role}`,
    role,
    createdAt: new Date('2026-01-02T00:00:00Z'),
    lastSeenAt: new Date('2026-01-03T00:00:00Z'),
    user: {
      id: `user-${role}`,
      name: `${role} user`,
      email: `${role}@example.com`,
      image: null,
      twoFactorEnabled: false,
    },
  }
}

describe('Organization member query use cases', () => {
  it('lists paginated members after checking membership', async () => {
    const memberships = createMemberships('admin')
    const memberQueries = createMemberQueries()
    const useCase = new ListOrganizationMembersUseCase(memberships, memberQueries)

    const result = await useCase.execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      filters: {
        search: ' admin ',
        role: 'admin,owner',
        sortBy: 'name',
        sortOrder: 'asc',
        page: 2,
        limit: 5,
      },
    })

    expect(memberships.findMembership).toHaveBeenCalledWith('user-1', 'org-1')
    expect(memberQueries.listMembersPage).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        search: 'admin',
        roleList: ['admin', 'owner'],
        sortBy: 'name',
        sortOrder: 'asc',
        page: 2,
        limit: 5,
      })
    )
    expect(result).toEqual(
      expect.objectContaining({
        total: 23,
        page: 2,
        limit: 5,
        totalPages: 5,
        hasNextPage: true,
        userRole: 'admin',
      })
    )
  })

  it('rejects member listing before loading members when actor is not a member', async () => {
    const memberQueries = createMemberQueries()
    const useCase = new ListOrganizationMembersUseCase(createMemberships(null), memberQueries)

    await expect(useCase.execute({ organizationId: 'org-1', actorId: 'user-1' })).rejects.toThrow(
      'User is not a member of this organization'
    )
    expect(memberQueries.listMembersPage).not.toHaveBeenCalled()
    expect(memberQueries.countMembers).not.toHaveBeenCalled()
  })

  it('builds the organization dashboard from query ports', async () => {
    const memberships = createMemberships('owner')
    const dashboardQuery = createDashboardQuery()
    const memberQueries = createMemberQueries()
    const useCase = new GetOrganizationDashboardUseCase(memberships, dashboardQuery, memberQueries)

    const result = await useCase.execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      filters: { sortBy: 'role', sortOrder: 'desc' },
    })

    expect(dashboardQuery.findDashboardOrganization).toHaveBeenCalledWith('org-1')
    expect(memberQueries.listMembersForDashboard).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ sortBy: 'role', sortOrder: 'desc' })
    )
    expect(result).toEqual(
      expect.objectContaining({
        memberCount: 1,
        total: 23,
        totalMembers: 23,
        currentPage: 1,
        totalPages: 3,
        hasNextPage: true,
        userRole: 'owner',
        metrics: {
          totalRequestsReceived: 12,
          totalNewVisitors: 34,
        },
      })
    )
  })
})
