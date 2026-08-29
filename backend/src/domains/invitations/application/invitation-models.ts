export interface OrganizationInvitation {
  id: string
  organizationId: string
  email: string
  role: string | null
  status: string
  archived: boolean
  expiresAt: Date
  inviterId: string
  createdAt?: unknown
  inviterName?: string | null
  inviterEmail?: string | null
  isExpired?: boolean
  userExists?: boolean
  memberCount?: number
  inviter?: {
    id: string | null
    name: string | null
    email: string | null
    image: string | null
    dominantColor: string | null
  } | null
  organization?: {
    id: string
    name: string
    logo?: string
    brandColor?: string | null
  }
}

export interface InvitationFilterOptions {
  page?: number
  limit?: number
  archived?: boolean
  search?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface InvitationListResponse {
  invitations: OrganizationInvitation[]
  total: number
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface InvitationOperationResult {
  success: boolean
  message?: string
  expiresAt?: Date
  previousRole?: string | null
  newRole?: string
  archivedCount?: number
  unarchivedCount?: number
  canceledCount?: number
  invitationId?: string
}

export interface AcceptInvitationResult {
  success: true
  message: string
  invitation: { id: string; organizationId: string; status: string }
  organization: { id: string; slug: string | null; name: string }
}

export interface CreateInvitationCommand {
  email: string
  role: string
  organizationId: string
  inviterId: string
}
