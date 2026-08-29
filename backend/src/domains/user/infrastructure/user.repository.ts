import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, organization, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import type { UserRepositoryPort } from '../application/ports'
import type { UserProfile } from '../application/user-models'

export class DrizzleUserRepository implements UserRepositoryPort {
  async updateUserName(userId: string, name: string): Promise<void> {
    const result = await db
      .update(user)
      .set({ name, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({ id: user.id })

    if (result.length === 0) {
      throw new Error('User not found')
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const result = await db
      .select({
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
          dominantColor: user.dominantColor,
          createdAt: user.createdAt,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo,
        },
      })
      .from(user)
      .innerJoin(member, eq(member.userId, user.id))
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(user.id, userId))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    return result[0]
  }
}
