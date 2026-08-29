import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import type { OrganizationInvitation } from '../application/invitation-models'

const mockInvitationApplicationService = {
  getInvitationDetails: mock((): Promise<OrganizationInvitation | null> => Promise.resolve(null)),
  acceptInvitation: mock(() =>
    Promise.resolve({
      success: true as const,
      message: 'Invitation accepted successfully',
      invitation: { id: 'invitation-123', organizationId: 'org-123', status: 'accepted' },
      organization: { id: 'org-123', slug: 'test-org', name: 'Test Organization' },
    })
  ),
}

mock.module('../invitations.application', () => ({
  invitationApplicationService: mockInvitationApplicationService,
}))

const { createInvitationsRoutes } = await import('../presentation/invitations.routes')

const authMiddleware = async (c: Context<{ Variables: CommonVariables }>, next: Next) => {
  c.set('user', { id: 'user-123', email: 'test@example.com' } as never)
  await next()
}

describe('Invitations routes', () => {
  let app: Hono<{ Variables: CommonVariables }>

  beforeEach(() => {
    app = new Hono<{ Variables: CommonVariables }>()
    const invitations = createInvitationsRoutes(mockInvitationApplicationService, authMiddleware)
    app.route('/invitations', invitations)

    Object.values(mockInvitationApplicationService).forEach((mockFn) => mockFn.mockClear())
  })

  it('returns invitation details without changing the response envelope', async () => {
    const invitationDetails: OrganizationInvitation = {
      id: 'invitation-123',
      organizationId: 'org-123',
      email: 'test@example.com',
      role: 'member',
      status: 'pending',
      archived: false,
      expiresAt: new Date('2026-05-14T00:00:00.000Z'),
      inviterId: 'inviter-123',
      isExpired: false,
    }
    mockInvitationApplicationService.getInvitationDetails.mockResolvedValue(invitationDetails)

    const response = await app.request('/invitations/invitation/invitation-123')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: {
        ...invitationDetails,
        expiresAt: '2026-05-14T00:00:00.000Z',
      },
    })
    expect(mockInvitationApplicationService.getInvitationDetails).toHaveBeenCalledWith(
      'invitation-123'
    )
  })

  it('returns 404 for missing invitation details', async () => {
    mockInvitationApplicationService.getInvitationDetails.mockResolvedValue(null)

    const response = await app.request('/invitations/invitation/missing')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({ success: false, code: 'NOT_FOUND', message: 'Invitation not found' })
  })

  it('accepts an invitation with the existing HTTP contract', async () => {
    const response = await app.request('/invitations/invitation/invitation-123/accept', {
      method: 'POST',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: {
        success: true,
        message: 'Invitation accepted successfully',
        invitation: { id: 'invitation-123', organizationId: 'org-123', status: 'accepted' },
        organization: { id: 'org-123', slug: 'test-org', name: 'Test Organization' },
      },
      message: 'Invitation accepted successfully',
    })
    expect(mockInvitationApplicationService.acceptInvitation).toHaveBeenCalledWith(
      'invitation-123',
      'user-123',
      'test@example.com'
    )
  })

  it('does not expose unexpected invitation acceptance failures', async () => {
    mockInvitationApplicationService.acceptInvitation.mockRejectedValueOnce(
      new Error('database password=secret')
    )

    const response = await app.request('/invitations/invitation/invitation-123/accept', {
      method: 'POST',
    })
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to accept invitation',
    })
  })
})
