export type OrganizationMemberUser = {
  id: string
  name: string
  email: string
  image?: string | null
  twoFactorEnabled?: boolean | null
}

export type OrganizationMember = {
  id: string
  organizationId: string
  userId: string
  role: string
  createdAt: Date
  lastSeenAt: Date | null
  user?: OrganizationMemberUser
}

export type OrganizationMemberFilterOptions = {
  search?: string
  role?: string
  sortBy?: 'name' | 'role' | 'joinedAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export type NormalizedOrganizationMemberFilters = {
  search?: string
  role?: string
  roleList: string[]
  isEmptyRoleFilter: boolean
  sortBy: 'name' | 'role' | 'joinedAt'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

export type OrganizationMembersPage = {
  members: OrganizationMember[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  userRole: string
}

export type OrganizationDashboardOrganization = {
  id: string
  name: string
  slug: string | null
  logo: string | null
  createdAt: Date
}

export type OrganizationDashboardMetrics = {
  totalRequestsReceived: number
  totalNewVisitors: number
}

export type OrganizationDashboard = {
  organization: OrganizationDashboardOrganization
  members: OrganizationMember[]
  memberCount: number
  total: number
  userRole: string
  metrics: OrganizationDashboardMetrics
  totalMembers: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
}

export function normalizeOrganizationMemberFilters(
  options: OrganizationMemberFilterOptions = {}
): NormalizedOrganizationMemberFilters {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(Math.max(1, options.limit ?? 10), 100)
  const role = options.role?.trim()
  const roleList =
    role && role !== 'all' && role !== 'empty'
      ? role
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : []

  return {
    search: options.search?.trim() || undefined,
    role,
    roleList,
    isEmptyRoleFilter: role === 'empty',
    sortBy: options.sortBy ?? 'role',
    sortOrder: options.sortOrder ?? 'desc',
    page,
    limit,
  }
}

export function calculateOrganizationMemberPagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit)

  return {
    totalPages,
    hasNextPage: page < totalPages,
  }
}

export function buildOrganizationMembersPage(input: {
  members: OrganizationMember[]
  total: number
  page: number
  limit: number
  userRole: string
}): OrganizationMembersPage {
  const { totalPages, hasNextPage } = calculateOrganizationMemberPagination(
    input.total,
    input.page,
    input.limit
  )

  return {
    members: input.members,
    total: input.total,
    page: input.page,
    limit: input.limit,
    totalPages,
    hasNextPage,
    userRole: input.userRole,
  }
}

export function buildOrganizationDashboard(input: {
  organization: OrganizationDashboardOrganization
  members: OrganizationMember[]
  totalMembers: number
  userRole: string
  metrics: Partial<OrganizationDashboardMetrics> | null
  page: number
  limit: number
}): OrganizationDashboard {
  const { totalPages, hasNextPage } = calculateOrganizationMemberPagination(
    input.totalMembers,
    input.page,
    input.limit
  )

  return {
    organization: input.organization,
    members: input.members,
    memberCount: input.members.length,
    total: input.totalMembers,
    userRole: input.userRole,
    metrics: {
      totalRequestsReceived: input.metrics?.totalRequestsReceived ?? 0,
      totalNewVisitors: input.metrics?.totalNewVisitors ?? 0,
    },
    totalMembers: input.totalMembers,
    currentPage: input.page,
    totalPages,
    hasNextPage,
  }
}
