import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { member, organization, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'
import type {
  OrganizationLeavingMember,
  OrganizationMemberMutationRepositoryPort,
  OrganizationMemberRemoval,
  OrganizationMemberRoleUpdate,
} from '../application/ports'

export class DrizzleOrganizationMemberMutationRepository
  implements OrganizationMemberMutationRepositoryPort
{
  async findMemberForRoleUpdate(
    organizationId: string,
    memberId: string
  ): Promise<OrganizationMemberRoleUpdate | null> {
    const [row] = await db
      .select({
        id: member.id,
        userId: member.userId,
        role: member.role,
        userName: user.name,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
      .limit(1)

    return row ?? null
  }

  async updateMemberRole(memberId: string, newRole: 'admin' | 'member'): Promise<void> {
    await db.update(member).set({ role: newRole }).where(eq(member.id, memberId))
  }

  async findMemberForRemoval(
    organizationId: string,
    memberId: string
  ): Promise<OrganizationMemberRemoval | null> {
    const [row] = await db
      .select({
        id: member.id,
        userId: member.userId,
        role: member.role,
        userName: user.name,
        userEmail: user.email,
        organizationName: organization.name,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(and(eq(member.id, memberId), eq(member.organizationId, organizationId)))
      .limit(1)

    return row ?? null
  }

  async removeMemberAndUnassignRequests(input: {
    organizationId: string
    memberId: string
    userId: string
  }): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(request)
        .set({ assignedToId: null })
        .where(
          and(
            eq(request.assignedToId, input.userId),
            eq(request.receiverOrganizationId, input.organizationId)
          )
        )

      await tx.delete(member).where(eq(member.id, input.memberId))
    })
  }

  async findLeavingMember(
    organizationId: string,
    userId: string
  ): Promise<OrganizationLeavingMember | null> {
    const [row] = await db
      .select({
        role: member.role,
        userName: user.name,
        userEmail: user.email,
        organizationName: organization.name,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1)

    return row ?? null
  }

  async leaveOrganizationAndUnassignRequests(input: {
    organizationId: string
    userId: string
  }): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(request)
        .set({ assignedToId: null })
        .where(
          and(
            eq(request.assignedToId, input.userId),
            eq(request.receiverOrganizationId, input.organizationId)
          )
        )

      await tx
        .delete(member)
        .where(
          and(eq(member.userId, input.userId), eq(member.organizationId, input.organizationId))
        )
    })
  }
}
