import { describe, expect, it } from 'bun:test'
import { RequestAggregate, type RequestSnapshot } from '../domain/request'
import { calculateRequestPriority, ERequestPriority } from '../domain/request-priority'

function dateAfter(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

function makeRequest(overrides: Partial<RequestSnapshot> = {}): RequestSnapshot {
  return {
    id: 'req-1',
    reqNumber: 'REQ-123',
    lifecycleStatus: 'open',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    requesterId: 'requester-user',
    receiverOrganizationId: 'org-1',
    fromDate: dateAfter(10),
    toDate: dateAfter(12),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('Request domain', () => {
  describe('priority', () => {
    it('marks near future requests as high priority', () => {
      expect(calculateRequestPriority(dateAfter(2), 'pending')).toBe(ERequestPriority.HIGH)
    })

    it('marks standard lead time requests as medium priority', () => {
      expect(calculateRequestPriority(dateAfter(10), 'pending')).toBe(ERequestPriority.MEDIUM)
    })

    it('returns null for invoiced or past requests', () => {
      expect(calculateRequestPriority(dateAfter(10), 'invoiced')).toBeNull()
      expect(calculateRequestPriority(dateAfter(-1), 'pending')).toBeNull()
    })
  })

  describe('transitions', () => {
    it('validates draft requests into pending requests', () => {
      const request = RequestAggregate.from(makeRequest({ lifecycleStatus: 'draft' }))

      request.validateDraft('user-1')

      expect(request.lifecycleStatus).toBe('open')
      expect(request.domainEvents).toEqual([
        expect.objectContaining({
          type: 'request.draft_validated',
          requestId: 'req-1',
          validatedById: 'user-1',
          previousLifecycleStatus: 'draft',
        }),
      ])
    })

    it('rejects non-draft validation', () => {
      const request = RequestAggregate.from(makeRequest({ lifecycleStatus: 'open' }))

      expect(() => request.validateDraft('user-1')).toThrow('Only draft requests can be validated')
    })

    it('records assignment with previous assignee context', () => {
      const request = RequestAggregate.from(makeRequest({ assignedToId: 'old-user' }))

      request.assignToMember('new-user', 'admin-user')

      expect(request.toSnapshot()).toMatchObject({
        assignedToId: 'new-user',
        assignedById: 'admin-user',
      })
      expect(request.domainEvents[0]).toEqual(
        expect.objectContaining({
          type: 'request.assigned',
          assignedToId: 'new-user',
          assignedById: 'admin-user',
          previousAssignedToId: 'old-user',
        })
      )
    })

    it('records unassignment with previous assignee context', () => {
      const request = RequestAggregate.from(
        makeRequest({ assignedToId: 'old-user', assignedById: 'admin-user' })
      )

      request.unassign('admin-user')

      expect(request.toSnapshot()).toMatchObject({
        assignedToId: null,
        assignedById: null,
        assignedAt: null,
      })
      expect(request.domainEvents[0]).toEqual(
        expect.objectContaining({
          type: 'request.unassigned',
          unassignedById: 'admin-user',
          previousAssignedToId: 'old-user',
        })
      )
    })

    it('records rejection and cancellation events without infrastructure', () => {
      const rejected = RequestAggregate.from(makeRequest())
      rejected.reject('admin-user', 'Not suitable')

      const canceled = RequestAggregate.from(makeRequest())
      canceled.cancel('requester-user')

      expect(rejected.lifecycleStatus).toBe('closed')
      expect(rejected.closedReason).toBe('request_rejected')
      expect(rejected.domainEvents[0]).toEqual(
        expect.objectContaining({ type: 'request.rejected', reason: 'Not suitable' })
      )
      expect(canceled.lifecycleStatus).toBe('closed')
      expect(canceled.closedReason).toBe('cancelled')
      expect(canceled.domainEvents[0]).toEqual(
        expect.objectContaining({ type: 'request.canceled', canceledById: 'requester-user' })
      )
    })
  })
})
