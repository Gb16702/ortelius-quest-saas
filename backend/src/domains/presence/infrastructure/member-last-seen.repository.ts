import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { PresenceLastSeenPort } from '../application/ports'

export class DrizzleMemberLastSeenRepository implements PresenceLastSeenPort {
  async markUserLastSeen(userId: string, lastSeenAt: Date): Promise<void> {
    await db.update(member).set({ lastSeenAt }).where(eq(member.userId, userId))
  }
}
