import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'
import type {
  MemberProfileAssignedRequest,
  MemberProfileMembershipRecord,
  MemberProfileUser,
} from '../application/member-profile-models'
import type { MemberProfileRepositoryPort } from '../application/ports'

export class DrizzleMemberProfileRepository implements MemberProfileRepositoryPort {
  async findMembershipByUserId(userId: string): Promise<MemberProfileMembershipRecord | null> {
    const [membership] = await db
      .select({
        id: member.id,
        userId: member.userId,
        organizationId: member.organizationId,
        role: member.role,
        joinedAt: member.createdAt,
      })
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1)

    return membership ?? null
  }

  async findMembershipInOrganization(
    userId: string,
    organizationId: string
  ): Promise<MemberProfileMembershipRecord | null> {
    const [membership] = await db
      .select({
        id: member.id,
        userId: member.userId,
        organizationId: member.organizationId,
        role: member.role,
        joinedAt: member.createdAt,
      })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1)

    return membership ?? null
  }

  async findUserById(userId: string): Promise<MemberProfileUser | null> {
    const [profileUser] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        dominantColor: user.dominantColor,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return profileUser ?? null
  }

  async listAssignedRequests(
    userId: string,
    organizationId: string
  ): Promise<MemberProfileAssignedRequest[]> {
    const assignedRequests = await db
      .select({
        id: request.id,
        requestNumber: request.reqNumber,
        lifecycleStatus: request.lifecycleStatus,
        closedReason: request.closedReason,
        categories: request.categories,
        services: request.services,
        createdAt: request.createdAt,
      })
      .from(request)
      .where(
        and(eq(request.assignedToId, userId), eq(request.receiverOrganizationId, organizationId))
      )
      .orderBy(desc(request.createdAt))
      .limit(5)

    return assignedRequests.map((req) => ({
      id: req.id,
      requestNumber: req.requestNumber,
      lifecycleStatus: req.lifecycleStatus,
      closedReason: req.closedReason,
      categories: (req.categories as string[]) || [],
      services: (req.services as string[]) || [],
      createdAt: req.createdAt,
    }))
  }
}
