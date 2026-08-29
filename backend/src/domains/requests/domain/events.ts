import type { RequestLifecycleStatus } from './request-lifecycle'

interface RequestDomainEventBase {
  requestId: string
  requestNumber: string
  organizationId: string
  occurredAt: Date
}

export interface RequestCreated extends RequestDomainEventBase {
  type: 'request.created'
  requesterId?: string | null
}

export interface RequestRejected extends RequestDomainEventBase {
  type: 'request.rejected'
  rejectedById: string
  reason?: string
}

export interface RequestCanceled extends RequestDomainEventBase {
  type: 'request.canceled'
  canceledById: string
}

export interface RequestDraftValidated extends RequestDomainEventBase {
  type: 'request.draft_validated'
  validatedById: string
  previousLifecycleStatus: RequestLifecycleStatus
}

export interface RequestAssigned extends RequestDomainEventBase {
  type: 'request.assigned'
  assignedToId: string
  assignedById: string
  previousAssignedToId?: string | null
}

export interface RequestUnassigned extends RequestDomainEventBase {
  type: 'request.unassigned'
  unassignedById: string
  previousAssignedToId?: string | null
}

export type RequestDomainEvent =
  | RequestCreated
  | RequestRejected
  | RequestCanceled
  | RequestDraftValidated
  | RequestAssigned
  | RequestUnassigned
