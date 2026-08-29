import { pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { organization } from './auth-schema'
import { category } from './category-schema'

export const organizationCategories = pgTable(
  'organization_categories',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => category.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.categoryId] })]
)
