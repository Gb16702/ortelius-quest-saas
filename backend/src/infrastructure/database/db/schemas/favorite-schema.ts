import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { organization, user } from './auth-schema'

export const favoriteEntityTypeEnum = pgEnum('favorite_entity_type', [
  'request',
  'quote',
  'invoice',
  'member',
  'conversation',
  'assistant_conversation',
])

export const favorite = pgTable(
  'favorite',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    entityType: favoriteEntityTypeEnum('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'cascade',
    }),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('favorite_user_entity_unique').on(table.userId, table.entityType, table.entityId),
    index('favorite_user_created_idx').on(table.userId, table.createdAt.desc()),
    index('favorite_user_org_idx').on(table.userId, table.organizationId),
  ]
)

export const favoriteGroup = pgTable(
  'favorite_group',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('favorite_group_user_org_position_idx').on(
      table.userId,
      table.organizationId,
      table.position
    ),
  ]
)

export const favoritePlacement = pgTable(
  'favorite_placement',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    entityType: favoriteEntityTypeEnum('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    groupId: uuid('group_id').references(() => favoriteGroup.id, { onDelete: 'set null' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('favorite_placement_user_entity_unique').on(
      table.userId,
      table.organizationId,
      table.entityType,
      table.entityId
    ),
    index('favorite_placement_user_org_group_position_idx').on(
      table.userId,
      table.organizationId,
      table.groupId,
      table.position
    ),
  ]
)

export type Favorite = typeof favorite.$inferSelect
export type NewFavorite = typeof favorite.$inferInsert
export type FavoriteGroup = typeof favoriteGroup.$inferSelect
export type NewFavoriteGroup = typeof favoriteGroup.$inferInsert
export type FavoritePlacement = typeof favoritePlacement.$inferSelect
export type NewFavoritePlacement = typeof favoritePlacement.$inferInsert
