import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export enum ServiceType {
  Cargo = 'cargo',
  Storage = 'storage',
  Logistics = 'logistics',
  Port = 'port',
}

export const serviceTypeEnum = pgEnum('service_type', ['cargo', 'storage', 'logistics', 'port'])

export const service = pgTable('service', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  type: serviceTypeEnum('type').notNull(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
})
