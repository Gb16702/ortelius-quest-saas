import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import type { CreateRequestData, Request } from '../application/request-models'
import {
  RequestCancelForbiddenError,
  RequestOrganizationForbiddenError,
  RequestShareForbiddenError,
  RequestTeamChatNotFoundError,
} from '../domain/errors'

const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  role: 'member',
}

const platformAdmin = {
  ...testUser,
  id: 'admin-user',
  email: 'admin@example.com',
  name: 'Platform Admin',
  role: 'admin',
}

const mockRequestsApplicationService = {
  createRequest: mock((): Promise<Request> => Promise.resolve({} as Request)),
  updateRequest: mock((): Promise<Request> => Promise.resolve({} as Request)),
  getRequestById: mock((): Promise<Request | null> => Promise.resolve(null)),
  getRequestByNumber: mock((): Promise<Request | null> => Promise.resolve(null)),
  getUserRequests: mock(() =>
    Promise.resolve({ requests: [makeRequest()], pagination: { total: 1 } })
  ),
  getAccessibleRequests: mock(() =>
    Promise.resolve({ requests: [makeRequest()], pagination: { total: 1 } })
  ),
  getOrganizationMembers: mock(() => Promise.resolve([{ id: 'member-1' }])),
  rejectRequest: mock((): Promise<void> => Promise.resolve()),
  cancelRequest: mock((): Promise<void> => Promise.resolve()),
  validateDraft: mock((): Promise<void> => Promise.resolve()),
  assignRequestToMember: mock((): Promise<void> => Promise.resolve()),
  reassignRequestToMember: mock((): Promise<void> => Promise.resolve()),
  unassignRequest: mock((): Promise<void> => Promise.resolve()),
  linkRequestsToUser: mock((): Promise<void> => Promise.resolve()),
  shareRequestToTeamChat: mock(() => Promise.resolve(makeTeamChatMessage())),
  resolveAccessibleRequestById: mock((): Promise<string | null> => Promise.resolve('req-1')),
  resolveAccessibleRequestByNumber: mock((): Promise<string | null> => Promise.resolve('req-1')),
  getRequestOrganizationId: mock((): Promise<string | null> => Promise.resolve('org-123')),
  canAssignRequests: mock((): Promise<boolean> => Promise.resolve(true)),
  canViewAssignedRequests: mock((): Promise<boolean> => Promise.resolve(true)),
}

const mockLogEvent = mock((): Promise<void> => Promise.resolve())
const mockRequireAuthMiddleware = mock(
  async (c: Context<{ Variables: CommonVariables }>, next: Next) => {
    const user = c.get('user')

    if (!user) {
      return c.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Authentication required' },
        401
      )
    }

    c.set('userId', user.id)
    await next()
  }
)
const mockRequireRequestActionPermission = mock(() => async (_c: Context, next: Next) => {
  await next()
})
mock.module('../requests.application', () => ({
  requestsApplicationService: mockRequestsApplicationService,
}))

mock.module('../../activity/activity.application', () => ({
  activityApplicationService: {
    logEvent: mockLogEvent,
  },
}))

mock.module('../../../infrastructure/auth/auth.middleware', () => ({
  requireAuthMiddleware: mockRequireAuthMiddleware,
}))

mock.module('../presentation/middleware/request-action.middleware', () => ({
  requireRequestActionPermission: mockRequireRequestActionPermission,
}))

const { default: requests } = await import('../presentation/requests.routes')

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    reqNumber: 'REQ-123',
    lifecycleStatus: 'open',
    requesterEmail: 'test@example.com',
    requesterName: 'Test User',
    receiverOrganizationId: 'org-123',
    categories: ['cat-1'],
    fromDate: new Date('2026-05-08T00:00:00.000Z'),
    toDate: new Date('2026-05-09T00:00:00.000Z'),
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    ...overrides,
  }
}

function makeTeamChatMessage() {
  return {
    id: 'message-1',
    conversationId: 'team-chat-1',
    senderId: 'user-123',
    content: 'Someone shared a request',
    messageType: 'system',
    isEdited: false,
    isDeleted: false,
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    updatedAt: new Date('2026-05-07T00:00:00.000Z'),
  }
}

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/requests', requests)
  return app
}

function createAuthenticatedApp(user = testUser) {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.use('*', async (c, next) => {
    c.set('user', user)
    await next()
  })
  app.route('/requests', requests)
  return app
}

describe('Requests Routes', () => {
  let app: Hono<{ Variables: CommonVariables }>

  beforeEach(() => {
    app = createApp()

    Object.values(mockRequestsApplicationService).forEach((mockFn) => mockFn.mockReset())
    mockRequestsApplicationService.createRequest.mockResolvedValue(makeRequest())
    mockRequestsApplicationService.updateRequest.mockResolvedValue(makeRequest())
    mockRequestsApplicationService.getRequestById.mockResolvedValue(null)
    mockRequestsApplicationService.getRequestByNumber.mockResolvedValue(null)
    mockRequestsApplicationService.getUserRequests.mockResolvedValue({
      requests: [makeRequest()],
      pagination: { total: 1 },
    })
    mockRequestsApplicationService.getAccessibleRequests.mockResolvedValue({
      requests: [makeRequest()],
      pagination: { total: 1 },
    })
    mockRequestsApplicationService.getOrganizationMembers.mockResolvedValue([{ id: 'member-1' }])
    mockRequestsApplicationService.rejectRequest.mockResolvedValue()
    mockRequestsApplicationService.cancelRequest.mockResolvedValue()
    mockRequestsApplicationService.validateDraft.mockResolvedValue()
    mockRequestsApplicationService.assignRequestToMember.mockResolvedValue()
    mockRequestsApplicationService.reassignRequestToMember.mockResolvedValue()
    mockRequestsApplicationService.unassignRequest.mockResolvedValue()
    mockRequestsApplicationService.linkRequestsToUser.mockResolvedValue()
    mockRequestsApplicationService.shareRequestToTeamChat.mockResolvedValue(makeTeamChatMessage())
    mockRequestsApplicationService.resolveAccessibleRequestById.mockResolvedValue('req-1')
    mockRequestsApplicationService.resolveAccessibleRequestByNumber.mockResolvedValue('req-1')
    mockRequestsApplicationService.getRequestOrganizationId.mockResolvedValue('org-123')
    mockRequestsApplicationService.canAssignRequests.mockResolvedValue(true)
    mockRequestsApplicationService.canViewAssignedRequests.mockResolvedValue(true)

    mockLogEvent.mockReset()
    mockLogEvent.mockResolvedValue()
    mockRequireAuthMiddleware.mockClear()
    mockRequireRequestActionPermission.mockClear()
  })

  describe('POST /requests', () => {
    it('creates a request with valid data', async () => {
      const validRequestData: CreateRequestData = {
        requesterEmail: 'test@example.com',
        requesterName: 'Test User',
        receiverOrganizationId: 'org-123',
        categories: ['cat-1'],
        fromDate: '2026-05-08T00:00:00.000Z',
        toDate: '2026-05-09T00:00:00.000Z',
      }

      const response = await app.request('/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequestData),
      })
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Request created successfully')
      expect(json.data.id).toBe('req-1')
      expect(mockRequestsApplicationService.createRequest).toHaveBeenCalledTimes(1)
      expect(mockRequestsApplicationService.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterEmail: 'test@example.com',
          requesterName: 'Test User',
          receiverOrganizationId: 'org-123',
          categories: ['cat-1'],
        })
      )
    })

    it('rejects invalid request data', async () => {
      const response = await app.request('/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterEmail: 'invalid-email' }),
      })

      expect(response.status).toBe(400)
      expect(mockRequestsApplicationService.createRequest).not.toHaveBeenCalled()
    })
  })

  describe('GET /requests', () => {
    it('lists accessible requests for the authenticated user', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests?lifecycleStatus=open')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.pagination.total).toBe(1)
      expect(mockRequestsApplicationService.getAccessibleRequests).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ lifecycleStatus: 'open' })
      )
    })

    it('maps inaccessible organization filters to forbidden instead of a generic failure', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.getAccessibleRequests.mockRejectedValueOnce(
        new RequestOrganizationForbiddenError('org-2')
      )

      const response = await authApp.request('/requests?organizationId=org-2')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json).toEqual({
        success: false,
        code: 'FORBIDDEN',
        message: 'You are not a member of the requested organization',
      })
    })
  })

  describe('GET /requests/user/:userId', () => {
    it('requires authentication before loading user requests', async () => {
      const response = await app.request('/requests/user/user-123?page=1&limit=10')
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json).toEqual({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
      expect(mockRequestsApplicationService.getUserRequests).not.toHaveBeenCalled()
    })

    it('lists only the authenticated requester requests for non-admin users', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/user/user-123?lifecycleStatus=open')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.pagination.total).toBe(1)
      expect(mockRequestsApplicationService.getUserRequests).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ lifecycleStatus: 'open' })
      )
    })

    it('rejects cross-user requester listing before loading protected data', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/user/other-user?page=1&limit=10')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json).toEqual({
        success: false,
        code: 'FORBIDDEN',
        message: 'You can only access your own requests',
      })
      expect(mockRequestsApplicationService.getUserRequests).not.toHaveBeenCalled()
    })

    it('allows platform admins to list a target requester explicitly', async () => {
      const adminApp = createAuthenticatedApp(platformAdmin)

      const response = await adminApp.request('/requests/user/requester-user?page=1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(mockRequestsApplicationService.getUserRequests).toHaveBeenCalledWith(
        'requester-user',
        expect.objectContaining({ page: 1 })
      )
    })
  })

  describe('GET /requests/:id', () => {
    it('returns request when found', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.getRequestById.mockResolvedValue(makeRequest())

      const response = await authApp.request('/requests/req-1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.id).toBe('req-1')
      expect(mockRequestsApplicationService.resolveAccessibleRequestById).toHaveBeenCalledWith(
        'req-1',
        'user-123'
      )
      expect(mockRequestsApplicationService.getRequestById).toHaveBeenCalledWith('req-1')
    })

    it('returns 404 without loading details when the user cannot access the request id', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.resolveAccessibleRequestById.mockResolvedValue(null)

      const response = await authApp.request('/requests/other-request')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.code).toBe('NOT_FOUND')
      expect(json.message).toBe('Request not found')
      expect(mockRequestsApplicationService.getRequestById).not.toHaveBeenCalled()
    })
  })

  describe('GET /requests/by-number/:requestNumber', () => {
    it('returns request by number only after access is resolved', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.getRequestById.mockResolvedValue(makeRequest())

      const response = await authApp.request('/requests/by-number/REQ-123')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.id).toBe('req-1')
      expect(mockRequestsApplicationService.resolveAccessibleRequestByNumber).toHaveBeenCalledWith(
        'REQ-123',
        'user-123'
      )
      expect(mockRequestsApplicationService.getRequestById).toHaveBeenCalledWith('req-1')
    })

    it('returns 404 when the current user cannot access that request number', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.resolveAccessibleRequestByNumber.mockResolvedValue(null)

      const response = await authApp.request('/requests/by-number/REQ-OTHER')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.code).toBe('NOT_FOUND')
      expect(json.message).toBe('Request not found')
      expect(mockRequestsApplicationService.getRequestById).not.toHaveBeenCalled()
    })
  })

  describe('PATCH /requests/:id', () => {
    it('requires authentication', async () => {
      const response = await app.request('/requests/req-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterName: 'Test User Updated' }),
      })

      expect(response.status).toBe(401)
      expect(mockRequestsApplicationService.updateRequest).not.toHaveBeenCalled()
    })

    it('updates request with valid data', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.updateRequest.mockResolvedValue(
        makeRequest({ requesterName: 'Test User Updated' })
      )

      const response = await authApp.request('/requests/req-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterName: 'Test User Updated' }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Request updated successfully')
      expect(mockRequestsApplicationService.updateRequest).toHaveBeenCalledWith(
        'req-1',
        {
          requesterName: 'Test User Updated',
        },
        'user-123'
      )
      expect(mockLogEvent).not.toHaveBeenCalled()
    })
  })

  describe('PATCH /requests/:id/reject', () => {
    it('rejects request successfully', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/req-1/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Not suitable' }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Request rejected successfully')
      expect(mockRequestsApplicationService.rejectRequest).toHaveBeenCalledWith(
        'req-1',
        'user-123',
        'Not suitable'
      )
    })
  })

  describe('PATCH /requests/:id/cancel', () => {
    it('cancels request successfully when a user is available in context', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/req-1/cancel', {
        method: 'PATCH',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Request cancelled successfully')
      expect(mockRequestsApplicationService.cancelRequest).toHaveBeenCalledWith('req-1', 'user-123')
    })

    it('returns 403 when the domain rejects cancellation by a different requester', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.cancelRequest.mockRejectedValue(
        new RequestCancelForbiddenError()
      )

      const response = await authApp.request('/requests/req-1/cancel', {
        method: 'PATCH',
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.code).toBe('FORBIDDEN')
      expect(json.message).toBe('Only the request owner can cancel this request')
    })
  })

  describe('PATCH /requests/:id/validate', () => {
    it('validates a draft request successfully', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/req-1/validate', {
        method: 'PATCH',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Draft validated successfully')
      expect(mockRequestsApplicationService.validateDraft).toHaveBeenCalledWith('req-1', 'user-123')
    })
  })

  describe('DELETE /requests/:id/documents', () => {
    it('does not expose request-domain document deletion', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/req-1/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentUrl: 'https://cdn.test/doc.pdf' }),
      })

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /requests/link-to-user/:userId', () => {
    it('rejects non-admin actors before linking requests', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/link-to-user/other-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: 'requester@example.com' }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json).toEqual({
        success: false,
        code: 'FORBIDDEN',
        message: 'Platform admin access required',
      })
      expect(mockRequestsApplicationService.linkRequestsToUser).not.toHaveBeenCalled()
    })

    it('allows platform admins to link anonymous requests to a target user', async () => {
      const adminApp = createAuthenticatedApp(platformAdmin)

      const response = await adminApp.request('/requests/link-to-user/target-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: 'requester@example.com' }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(mockRequestsApplicationService.linkRequestsToUser).toHaveBeenCalledWith(
        'requester@example.com',
        'target-user'
      )
    })
  })

  describe('POST /requests/:id/assign', () => {
    it('assigns request successfully', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/req-1/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: 'assignee-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Request assigned successfully')
      expect(mockRequestsApplicationService.getRequestOrganizationId).toHaveBeenCalledWith('req-1')
      expect(mockRequestsApplicationService.canAssignRequests).toHaveBeenCalledWith(
        'org-123',
        'user-123'
      )
      expect(mockRequestsApplicationService.assignRequestToMember).toHaveBeenCalledWith(
        'req-1',
        'assignee-123',
        'user-123'
      )
    })

    it('returns 403 and does not assign when the actor is outside the request organization', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.canAssignRequests.mockResolvedValue(false)

      const response = await authApp.request('/requests/req-1/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: 'assignee-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json).toEqual({
        success: false,
        code: 'FORBIDDEN',
        message: 'You must be a member of the organization to assign requests',
      })
      expect(mockRequestsApplicationService.assignRequestToMember).not.toHaveBeenCalled()
    })
  })

  describe('POST /requests/:id/share-to-team-chat', () => {
    it('shares a request to team chat successfully', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/req-1/share-to-team-chat', {
        method: 'POST',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Request shared to team chat successfully')
      expect(json.data.id).toBe('message-1')
      expect(mockRequestsApplicationService.shareRequestToTeamChat).toHaveBeenCalledWith(
        'req-1',
        'user-123'
      )
    })

    it('returns 403 when the user cannot share the request', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.shareRequestToTeamChat.mockRejectedValue(
        new RequestShareForbiddenError()
      )

      const response = await authApp.request('/requests/req-1/share-to-team-chat', {
        method: 'POST',
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.code).toBe('FORBIDDEN')
      expect(json.message).toBe('You must be a member of the organization to share requests')
    })

    it('returns 404 when the team chat does not exist', async () => {
      const authApp = createAuthenticatedApp()
      mockRequestsApplicationService.shareRequestToTeamChat.mockRejectedValue(
        new RequestTeamChatNotFoundError('org-123')
      )

      const response = await authApp.request('/requests/req-1/share-to-team-chat', {
        method: 'POST',
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.code).toBe('NOT_FOUND')
      expect(json.message).toBe('Team chat not found for this organization')
    })
  })

  describe('GET /requests/organization/:organizationId/members', () => {
    it('lists organization members through the application service', async () => {
      const authApp = createAuthenticatedApp()

      const response = await authApp.request('/requests/organization/org-123/members')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual([{ id: 'member-1' }])
      expect(mockRequestsApplicationService.getOrganizationMembers).toHaveBeenCalledWith('org-123')
    })
  })
})
