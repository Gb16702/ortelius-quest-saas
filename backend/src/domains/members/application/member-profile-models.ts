import type { MemberRole } from '../domain'

export type { MemberRole } from '../domain'

export interface MemberProfileUser {
  id: string
  name: string
  email: string
  image: string | null
  dominantColor: string | null
  createdAt: Date
}

export interface MemberProfileMembership {
  id: string
  organizationId: string
  role: MemberRole
  joinedAt: Date
}

export interface MemberProfileMembershipRecord {
  id: string
  userId: string
  organizationId: string
  role: string
  joinedAt: Date
}

export interface MemberProfileAssignedRequest {
  id: string
  requestNumber: string
  lifecycleStatus: string
  closedReason: string | null
  categories: string[]
  services: string[]
  createdAt: Date
}

export interface MemberProfileResponse {
  user: MemberProfileUser
  membership: MemberProfileMembership
  assignedRequests: MemberProfileAssignedRequest[]
}
