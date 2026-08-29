import { asc, eq, sql } from 'drizzle-orm'
import { db, organization } from '../../../infrastructure/database'
import { member, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import type {
  RequestNotificationMember,
  RequestNotificationOrganization,
  RequestNotificationQueryAdapterPort,
  RequestNotificationUserProfile,
} from './request-notification.types'

export class RequestNotificationQueryAdapter implements RequestNotificationQueryAdapterPort {
  async getOrganization(organizationId: string): Promise<RequestNotificationOrganization> {
    const orgData = await db
      .select({ name: organization.name, slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return {
      name: orgData[0]?.name,
      slug: orgData[0]?.slug ?? undefined,
    }
  }

  async getOrganizationMembers(organizationId: string): Promise<RequestNotificationMember[]> {
    const roleOrder = sql`CASE WHEN ${member.role} = 'owner' THEN 0 WHEN ${member.role} = 'admin' THEN 1 WHEN ${member.role} = 'member' THEN 2 ELSE 3 END`

    return await db
      .select({
        role: member.role,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId))
      .orderBy(asc(roleOrder))
      .limit(10)
  }

  async resolveUserName(userId: string, fallback: string): Promise<string> {
    const userData = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    return userData[0]?.name || fallback
  }

  async resolveUserProfile(userId: string): Promise<RequestNotificationUserProfile> {
    const userData = await db
      .select({ name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return {
      name: userData[0]?.name,
      image: userData[0]?.image || null,
    }
  }
}
