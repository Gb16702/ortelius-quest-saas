import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'

const mockLoadSidebarBootstrap = mock(async () => ({
  members: {
    members: [
      {
        id: 'member-1',
        role: 'member',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        lastSeenAt: new Date('2026-05-27T10:00:00.000Z'),
        organizationId: 'org-1',
        userId: 'member-user-1',
        user: {
          id: 'member-user-1',
          name: 'Member One',
          email: 'member@example.test',
          image: null,
          twoFactorEnabled: false,
        },
      },
    ],
    total: 1,
    page: 1,
    limit: 100,
    totalPages: 1,
    hasNextPage: false,
    userRole: 'admin',
  },
  favorites: {
    favorites: [
      {
        id: 'favorite-1',
        entityType: 'conversation',
        entityId: 'conversation-1',
        organizationId: 'org-1',
        label: 'Member One',
        subtitle: 'Conversation',
        createdAt: '2026-05-27T10:00:00.000Z',
        meta: { isTeamChat: false },
      },
    ],
  },
  conversations: {
    conversations: [
      {
        id: 'conversation-1',
        name: 'Member One',
        createdBy: 'user-1',
        organizationId: 'org-1',
        conversationType: 'member_dm',
        isTeamChat: false,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-27T10:00:00.000Z'),
        lastMessage: null,
        participants: [],
        contextInfo: {
          type: 'user',
          id: 'member-user-1',
          name: 'Member One',
          image: null,
        },
      },
    ],
    pagination: {
      total: 1,
      limit: 50,
      offset: 0,
      hasMore: false,
    },
  },
}))

mock.module('../infrastructure/sidebar-bootstrap-query.service', () => ({
  loadSidebarBootstrap: mockLoadSidebarBootstrap,
}))

mock.module('../../../infrastructure/auth/auth.middleware', () => ({
  requireAuthMiddleware: async (c: Context<{ Variables: CommonVariables }>, next: Next) => {
    c.set('user', {
      id: 'user-1',
      email: 'user@example.test',
      name: 'User One',
      image: null,
      role: 'member',
    })
    await next()
  },
}))

const { default: appShellRoutes } = await import('../presentation/app-shell.routes')

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/app-shell', appShellRoutes)
  return app
}

describe('App shell routes', () => {
  beforeEach(() => {
    mockLoadSidebarBootstrap.mockClear()
  })

  it('loads the organization sidebar bootstrap in one response', async () => {
    const response = await createApp().request('/app-shell/organizations/org-1/sidebar-bootstrap')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.members.members).toHaveLength(1)
    expect(json.data.favorites.favorites).toHaveLength(1)
    expect(json.data.conversations.conversations).toHaveLength(1)
    expect(json.data.conversations.conversations[0].id).toBe('conversation-1')
    expect(mockLoadSidebarBootstrap).toHaveBeenCalledWith('user-1', 'org-1')
  })
})
