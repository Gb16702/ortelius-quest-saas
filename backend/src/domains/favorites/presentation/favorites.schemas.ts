import { z } from 'zod'

export const favoriteEntityTypeSchema = z.enum([
  'request',
  'quote',
  'invoice',
  'conversation',
  'member',
  'assistant_conversation',
])

export const favoritesQuerySchema = z.object({
  organizationId: z.string().optional(),
})

export const favoriteToggleSchema = z.object({
  entityType: favoriteEntityTypeSchema,
  entityId: z.string().min(1),
  organizationId: z.string().optional(),
})

export const favoriteGroupParamSchema = z.object({
  groupId: z.string().uuid(),
})

export const favoriteGroupCreateSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
})

export const favoriteGroupUpdateSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
})

export const favoriteGroupDeleteSchema = z.object({
  organizationId: z.string().min(1),
})

export const favoritePlacementSchema = z.object({
  entityType: favoriteEntityTypeSchema,
  entityId: z.string().min(1),
  groupId: z.string().uuid().nullable(),
  position: z.number().int().safe(),
})

export const favoriteReorderSchema = z.object({
  organizationId: z.string().min(1),
  items: z.array(favoritePlacementSchema).max(500),
  groups: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number().int().safe(),
      })
    )
    .max(100)
    .optional(),
})

export type FavoriteEntityType = z.infer<typeof favoriteEntityTypeSchema>
export type FavoriteToggleData = z.infer<typeof favoriteToggleSchema>
export type FavoriteGroupCreateData = z.infer<typeof favoriteGroupCreateSchema>
export type FavoriteGroupUpdateData = z.infer<typeof favoriteGroupUpdateSchema>
export type FavoriteReorderData = z.infer<typeof favoriteReorderSchema>
