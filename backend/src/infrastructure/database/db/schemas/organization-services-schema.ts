import { integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { organization } from './auth-schema'
import { service } from './services-schema'

export const organizationServices = pgTable(
  'organization_services',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    serviceId: text('service_id')
      .notNull()
      .references(() => service.id, { onDelete: 'cascade' }),
    price: integer('price'),
    currency: text('currency').default('EUR'),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.serviceId] })]
)
