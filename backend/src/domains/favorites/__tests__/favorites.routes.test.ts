import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'

const mockResolveFavoriteTarget = mock(
  async (
    _userId: string,
    entityType: 'member' | 'assistant_conversation',
    entityId: string,
    organizationId?: string
  ) => ({
    entityType,
    entityId,
    organizationId: organizationId ?? 'org-1',
    groupId: null,
    position: 0,
    label: entityType === 'assistant_conversation' ? 'New chat' : 'Member One',
    subtitle: entityType === 'assistant_conversation' ? 'AI chat' : 'Member profile',
    meta:
      entityType === 'assistant_conversation'
        ? { assistantChat: true, title: 'New chat' }
        : { name: 'Member One', image: null },
  })
)

const mockListFavoritesData = mock(async () => ({ favorites: [], groups: [] }))
const mockFindStoredFavorite = mock(
  async (_userId: string, entityType: 'member' | 'assistant_conversation', entityId: string) => ({
    id: `favorite-${entityType}-1`,
    entityType,
    entityId,
    organizationId: 'org-1',
    groupId: null,
    position: 0,
    label: entityType === 'assistant_conversation' ? 'New chat' : 'Member One',
    subtitle: entityType === 'assistant_conversation' ? 'AI chat' : 'Member profile',
    createdAt: '2026-05-28T10:00:00.000Z',
    meta:
      entityType === 'assistant_conversation'
        ? { assistantChat: true, title: 'New chat' }
        : { name: 'Member One', image: null },
  })
)
const mockOnConflictDoNothing = mock(async () => undefined)
const mockValues = mock(() => ({ onConflictDoNothing: mockOnConflictDoNothing }))
const mockInsert = mock(() => ({ values: mockValues }))

mock.module('../infrastructure/favorite-query.service', () => ({
  createFavoriteGroup: mock(async () => null),
  deleteFavoriteGroup: mock(async () => false),
  findStoredFavorite: mockFindStoredFavorite,
  listFavoritesData: mockListFavoritesData,
  removeFavoritePlacement: mock(async () => undefined),
  reorderFavorites: mock(async () => false),
  resolveFavoriteTarget: mockResolveFavoriteTarget,
  updateFavoriteGroup: mock(async () => null),
}))

mock.module('../../../infrastructure/database', () => ({
  db: {
    insert: mockInsert,
  },
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

const { default: favoritesRoutes } = await import('../presentation/favorites.routes')

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/favorites', favoritesRoutes)
  return app
}

describe('favorites routes', () => {
  beforeEach(() => {
    mockResolveFavoriteTarget.mockClear()
    mockFindStoredFavorite.mockClear()
    mockListFavoritesData.mockClear()
    mockInsert.mockClear()
    mockValues.mockClear()
    mockOnConflictDoNothing.mockClear()
  })

  it('favorites a member profile', async () => {
    const response = await createApp().request('/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'member',
        entityId: 'member-user-1',
        organizationId: 'org-1',
      }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.favorite).toMatchObject({
      id: 'favorite-member-1',
      entityType: 'member',
      entityId: 'member-user-1',
      organizationId: 'org-1',
      label: 'Member One',
      createdAt: '2026-05-28T10:00:00.000Z',
    })
    expect(mockResolveFavoriteTarget).toHaveBeenCalledWith(
      'user-1',
      'member',
      'member-user-1',
      'org-1'
    )
    expect(mockFindStoredFavorite).toHaveBeenCalledWith('user-1', 'member', 'member-user-1')
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'user-1',
      entityType: 'member',
      entityId: 'member-user-1',
      organizationId: 'org-1',
    })
  })

  it('favorites an assistant conversation through the generic favorite store', async () => {
    const response = await createApp().request('/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'assistant_conversation',
        entityId: 'assistant-conversation-1',
        organizationId: 'org-1',
      }),
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.favorite).toMatchObject({
      id: 'favorite-assistant_conversation-1',
      entityType: 'assistant_conversation',
      entityId: 'assistant-conversation-1',
      organizationId: 'org-1',
      label: 'New chat',
    })
    expect(mockResolveFavoriteTarget).toHaveBeenCalledWith(
      'user-1',
      'assistant_conversation',
      'assistant-conversation-1',
      'org-1'
    )
    expect(mockFindStoredFavorite).toHaveBeenCalledWith(
      'user-1',
      'assistant_conversation',
      'assistant-conversation-1'
    )
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'user-1',
      entityType: 'assistant_conversation',
      entityId: 'assistant-conversation-1',
      organizationId: 'org-1',
    })
  })
})
