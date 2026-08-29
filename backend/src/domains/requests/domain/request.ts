import {
  InvalidRequestAssignmentError,
  InvalidRequestStateError,
  RequestCancelForbiddenError,
} from './errors'
import type { RequestDomainEvent } from './events'
import type { RequestClosedReason, RequestLifecycleStatus } from './request-lifecycle'
import {
  canDeleteDraft,
  canValidateDraft,
  normalizeRequestClosedReason,
  normalizeRequestLifecycleStatus,
} from './request-lifecycle'

export interface RequestSnapshot {
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
  assignedToId?: string | null
  assignedAt?: Date | null
  assignedById?: string | null
  fromDate: Date
  toDate: Date
  createdAt: Date
  updatedAt: Date
}

export class RequestAggregate {
  private readonly events: RequestDomainEvent[] = []
  private snapshot: RequestSnapshot & {
    lifecycleStatus: RequestLifecycleStatus
    closedReason: RequestClosedReason | null
  }

  private constructor(
    snapshot: RequestSnapshot & {
      lifecycleStatus: RequestLifecycleStatus
      closedReason: RequestClosedReason | null
    }
  ) {
    this.snapshot = snapshot
  }

  static from(snapshot: RequestSnapshot): RequestAggregate {
    return new RequestAggregate({
      ...snapshot,
      lifecycleStatus: normalizeRequestLifecycleStatus(snapshot.lifecycleStatus),
      closedReason: normalizeRequestClosedReason(snapshot.closedReason),
    })
  }

  get id(): string {
    return this.snapshot.id
  }

  get reqNumber(): string {
    return this.snapshot.reqNumber
  }

  get lifecycleStatus(): RequestLifecycleStatus {
    return this.snapshot.lifecycleStatus
  }

  get closedReason(): RequestClosedReason | null {
    return this.snapshot.closedReason
  }

  get domainEvents(): RequestDomainEvent[] {
    return [...this.events]
  }

  reject(rejectedById: string, reason?: string): void {
    this.snapshot.lifecycleStatus = 'closed'
    this.snapshot.closedReason = 'request_rejected'
    this.snapshot.updatedAt = new Date()
    this.events.push({
      type: 'request.rejected',
      requestId: this.snapshot.id,
      requestNumber: this.snapshot.reqNumber,
      organizationId: this.snapshot.receiverOrganizationId,
      rejectedById,
      reason,
      occurredAt: new Date(),
    })
  }

  cancel(canceledById: string): void {
    if (this.snapshot.requesterId !== canceledById) {
      throw new RequestCancelForbiddenError()
    }

    this.snapshot.lifecycleStatus = 'closed'
    this.snapshot.closedReason = 'cancelled'
    this.snapshot.updatedAt = new Date()
    this.events.push({
      type: 'request.canceled',
      requestId: this.snapshot.id,
      requestNumber: this.snapshot.reqNumber,
      organizationId: this.snapshot.receiverOrganizationId,
      canceledById,
      occurredAt: new Date(),
    })
  }

  validateDraft(validatedById: string): void {
    if (!canValidateDraft(this.snapshot.lifecycleStatus)) {
      throw new InvalidRequestStateError('Only draft requests can be validated')
    }

    const previousLifecycleStatus = this.snapshot.lifecycleStatus
    this.snapshot.lifecycleStatus = 'open'
    this.snapshot.closedReason = null
    this.snapshot.updatedAt = new Date()
    this.events.push({
      type: 'request.draft_validated',
      requestId: this.snapshot.id,
      requestNumber: this.snapshot.reqNumber,
      organizationId: this.snapshot.receiverOrganizationId,
      validatedById,
      previousLifecycleStatus,
      occurredAt: new Date(),
    })
  }

  assertCanDeleteDraft(): void {
    if (!canDeleteDraft(this.snapshot.lifecycleStatus)) {
      throw new InvalidRequestStateError('Only draft requests can be deleted')
    }
  }

  assignToMember(assignedToId: string, assignedById: string): void {
    if (!assignedToId) {
      throw new InvalidRequestAssignmentError('Assigned member is required')
    }
    if (!assignedById) {
      throw new InvalidRequestAssignmentError('Assigning user is required')
    }

    const previousAssignedToId = this.snapshot.assignedToId
    this.snapshot.assignedToId = assignedToId
    this.snapshot.assignedById = assignedById
    this.snapshot.assignedAt = new Date()
    this.snapshot.updatedAt = new Date()
    this.events.push({
      type: 'request.assigned',
      requestId: this.snapshot.id,
      requestNumber: this.snapshot.reqNumber,
      organizationId: this.snapshot.receiverOrganizationId,
      assignedToId,
      assignedById,
      previousAssignedToId,
      occurredAt: new Date(),
    })
  }

  unassign(unassignedById: string): void {
    if (!unassignedById) {
      throw new InvalidRequestAssignmentError('Unassigning user is required')
    }

    const previousAssignedToId = this.snapshot.assignedToId
    this.snapshot.assignedToId = null
    this.snapshot.assignedById = null
    this.snapshot.assignedAt = null
    this.snapshot.updatedAt = new Date()
    this.events.push({
      type: 'request.unassigned',
      requestId: this.snapshot.id,
      requestNumber: this.snapshot.reqNumber,
      organizationId: this.snapshot.receiverOrganizationId,
      unassignedById,
      previousAssignedToId,
      occurredAt: new Date(),
    })
  }

  toSnapshot(): RequestSnapshot {
    return { ...this.snapshot }
  }
}
