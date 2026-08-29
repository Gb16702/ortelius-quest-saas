import type { RequestCargoDetails } from '../domain/cargo-details'
import type { RequestPriority } from '../domain/request-priority'

export type { RequestCargoDetails, RequestDimensions } from '../domain/cargo-details'
export type { RequestPriority } from '../domain/request-priority'

export interface CreateRequestData {
  requesterEmail: string
  requesterName: string
  requesterPhone?: string
  requesterId?: string
  receiverOrganizationId: string
  categories?: string[]
  services?: string[]
  extraServices?: string[]
  cargoDetails?: RequestCargoDetails
  comments?: string
  documents?: string[]
  fromDate: string | Date
  toDate: string | Date
}

export interface UpdateRequestData extends Partial<Omit<CreateRequestData, 'requesterId'>> {}

export interface Request {
  id: string
  reqNumber: string
  lifecycleStatus: string
  closedReason?: string | null
  requesterEmail: string
  requesterName: string
  requesterPhone?: string | null
  requesterId?: string | null
  receiverOrganizationId: string
  conversationId?: string | null
  categories?: string[] | null
  services?: string[] | null
  extraServices?: string[] | null
  cargoDetailsId?: string | null
  comments?: string | null
  documents?: string[] | null
  assignedToId?: string | null
  assignedAt?: Date | null
  assignedById?: string | null
  fromDate: Date
  toDate: Date
  createdAt: Date
  updatedAt: Date
}

export interface RequestWithRelations {
  id: string
  reqNumber: string
  lifecycleStatus: string
  closedReason?: string | null
  requesterEmail: string
  requesterName: string
  requesterPhone?: string | null
  requesterId?: string | null
  receiverOrganizationId: string
  conversationId?: string | null
  comments?: string | null
  documents?: string[] | null
  assignedToId?: string | null
  assignedAt?: Date | null
  assignedById?: string | null
  fromDate: Date
  toDate: Date
  createdAt: Date
  updatedAt: Date
  priority?: RequestPriority
  requester?: {
    id: string
    name: string
    email: string
    phone?: string | null
    image?: string | null
  }
  organization?: {
    id: string
    name: string
    slug: string
    logo?: string | null
    taxIdType?: string | null
  }
  assignedTo?: {
    id: string
    name: string
    email: string
    role: string
  }
  assignedBy?: {
    id: string
    name: string
    email: string
  }
  services?: Array<{
    id: string
    name: string
    slug: string
    type: 'cargo' | 'storage' | 'logistics' | 'port'
    createdAt: Date
  }>
  categories?: Array<{
    id: string
    name: string
    slug: string
    createdAt: Date
    updatedAt: Date
  }>
  cargoDetails?: {
    id: string
    weight?: number | null
    volume?: number | null
    palletCount?: number | null
    fragility?: string | null
    options?: Record<string, boolean> | null
    dimensions?: {
      length?: number | null
      width?: number | null
      height?: number | null
    } | null
  } | null
}

export interface RequestFilters {
  lifecycleStatus?: string
  closedReason?: string
  organizationId?: string
  search?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
  page?: number
}
