import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { requireAuthMiddleware } from '../../../infrastructure/auth/auth.middleware'
import { db } from '../../../infrastructure/database'
import { conversationParticipant } from '../../../infrastructure/database/db/schemas/chat-schema'
import { favorite } from '../../../infrastructure/database/db/schemas/favorite-schema'
import {
  type ApiResponse,
  type CommonVariables,
  createApiErrorResponse,
  ErrorCode,
} from '../../../infrastructure/types/api.types'
import {
  validateJson,
  validateParam,
  validateQuery,
} from '../../../infrastructure/validation/validation.utils'
import {
  createFavoriteGroup,
  deleteFavoriteGroup,
  findStoredFavorite,
  listFavoritesData,
  removeFavoritePlacement,
  reorderFavorites,
  resolveFavoriteTarget,
  updateFavoriteGroup,
} from '../infrastructure/favorite-query.service'
import {
  favoriteGroupCreateSchema,
  favoriteGroupDeleteSchema,
  favoriteGroupParamSchema,
  favoriteGroupUpdateSchema,
  favoriteReorderSchema,
  favoritesQuerySchema,
  favoriteToggleSchema,
} from './favorites.schemas'

const favorites = new Hono<{ Variables: CommonVariables }>()

function errorResponse(error: unknown, fallback: string): ApiResponse {
  console.error('[favorites] route error:', error)
  return createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, fallback)
}

favorites.get('/', requireAuthMiddleware, validateQuery(favoritesQuerySchema), async (c) => {
  try {
    const user = c.get('user')!
    const { organizationId } = c.req.valid('query')
    const data = await listFavoritesData(user.id, organizationId)

    return c.json({ success: true, data }, 200)
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to list favorites'), 500)
  }
})

favorites.post(
  '/groups',
  requireAuthMiddleware,
  validateJson(favoriteGroupCreateSchema),
  async (c) => {
    try {
      const user = c.get('user')!
      const { organizationId, name } = c.req.valid('json')
      const group = await createFavoriteGroup({ userId: user.id, organizationId, name })

      if (!group) {
        return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Organization not found'), 404)
      }

      return c.json({ success: true, data: { group } }, 201)
    } catch (error) {
      return c.json(errorResponse(error, 'Failed to create favorite group'), 500)
    }
  }
)

favorites.patch(
  '/groups/:groupId',
  requireAuthMiddleware,
  validateParam(favoriteGroupParamSchema),
  validateJson(favoriteGroupUpdateSchema),
  async (c) => {
    try {
      const user = c.get('user')!
      const { groupId } = c.req.valid('param')
      const { organizationId, name } = c.req.valid('json')
      const group = await updateFavoriteGroup({ userId: user.id, organizationId, groupId, name })

      if (!group) {
        return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Favorite group not found'), 404)
      }

      return c.json({ success: true, data: { group } }, 200)
    } catch (error) {
      return c.json(errorResponse(error, 'Failed to rename favorite group'), 500)
    }
  }
)

favorites.delete(
  '/groups/:groupId',
  requireAuthMiddleware,
  validateParam(favoriteGroupParamSchema),
  validateJson(favoriteGroupDeleteSchema),
  async (c) => {
    try {
      const user = c.get('user')!
      const { groupId } = c.req.valid('param')
      const { organizationId } = c.req.valid('json')
      const deleted = await deleteFavoriteGroup({ userId: user.id, organizationId, groupId })

      if (!deleted) {
        return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Favorite group not found'), 404)
      }

      return c.json({ success: true }, 200)
    } catch (error) {
      return c.json(errorResponse(error, 'Failed to remove favorite group'), 500)
    }
  }
)

favorites.patch('/order', requireAuthMiddleware, validateJson(favoriteReorderSchema), async (c) => {
  try {
    const user = c.get('user')!
    const { organizationId, items, groups } = c.req.valid('json')
    const updated = await reorderFavorites({ userId: user.id, organizationId, items, groups })

    if (!updated) {
      return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Favorite target not found'), 404)
    }

    return c.json({ success: true }, 200)
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to reorder favorites'), 500)
  }
})

favorites.put('/', requireAuthMiddleware, validateJson(favoriteToggleSchema), async (c) => {
  try {
    const user = c.get('user')!
    const { entityType, entityId, organizationId } = c.req.valid('json')
    const target = await resolveFavoriteTarget(user.id, entityType, entityId, organizationId)

    if (!target) {
      return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Favorite target not found'), 404)
    }

    if (entityType === 'conversation') {
      const pinnedAt = new Date()
      await db
        .update(conversationParticipant)
        .set({ isPinned: true, pinnedAt })
        .where(
          and(
            eq(conversationParticipant.userId, user.id),
            eq(conversationParticipant.conversationId, entityId)
          )
        )
      return c.json(
        {
          success: true,
          data: {
            favorite: {
              id: `conversation:${target.entityId}`,
              ...target,
              createdAt: pinnedAt.toISOString(),
            },
          },
        },
        200
      )
    }

    await db
      .insert(favorite)
      .values({
        userId: user.id,
        entityType,
        entityId,
        organizationId: target.organizationId,
      })
      .onConflictDoNothing()

    const storedFavorite = await findStoredFavorite(user.id, entityType, entityId)
    if (!storedFavorite) {
      return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Favorite target not found'), 404)
    }

    return c.json({ success: true, data: { favorite: storedFavorite } }, 200)
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to favorite item'), 500)
  }
})

favorites.delete('/', requireAuthMiddleware, validateJson(favoriteToggleSchema), async (c) => {
  try {
    const user = c.get('user')!
    const { entityType, entityId } = c.req.valid('json')

    if (entityType === 'conversation') {
      await db
        .update(conversationParticipant)
        .set({ isPinned: false, pinnedAt: null })
        .where(
          and(
            eq(conversationParticipant.userId, user.id),
            eq(conversationParticipant.conversationId, entityId)
          )
        )
      await removeFavoritePlacement(user.id, entityType, entityId)
      return c.json({ success: true }, 200)
    }

    await db
      .delete(favorite)
      .where(
        and(
          eq(favorite.userId, user.id),
          eq(favorite.entityType, entityType),
          eq(favorite.entityId, entityId)
        )
      )
    await removeFavoritePlacement(user.id, entityType, entityId)

    return c.json({ success: true }, 200)
  } catch (error) {
    return c.json(errorResponse(error, 'Failed to unfavorite item'), 500)
  }
})

export default favorites
