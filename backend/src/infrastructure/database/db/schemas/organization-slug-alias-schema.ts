import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { organization } from './auth-schema'

export const organizationSlugAlias = pgTable(
  'organization_slug_alias',
  {
    slug: text('slug').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index('idx_organization_slug_alias_org').on(table.organizationId)]
)
