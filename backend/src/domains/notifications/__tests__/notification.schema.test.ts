import { describe, expect, it } from 'bun:test'
import { getTableName } from 'drizzle-orm'
import { notification } from '../../../infrastructure/database/db/schemas/chat-schema'

describe('Notification database schema', () => {
  it('uses the migrated notification table name, not the websocket event name', () => {
    expect(getTableName(notification)).toBe('notification')
  })
})
