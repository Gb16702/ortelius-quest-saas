import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { EmailService } from '../../../../emails/services/email.service'
import { EmailTemplate } from '../../../../emails/types'
import { buildAuthLink } from '../../../infrastructure/auth/auth-link'
import { db } from '../../../infrastructure/database'
import {
  invitation,
  member,
  organization,
  user,
} from '../../../infrastructure/database/db/schemas/auth-schema'
import { conversation } from '../../../infrastructure/database/db/schemas/chat-schema'
import { conversationApplicationService as conversationService } from '../../messaging/conversation/conversation.application'
import { subscriptionApplicationService } from '../../subscription/subscription.application'
import type {
  AcceptInvitationResult,
  CreateInvitationCommand,
  InvitationFilterOptions,
  InvitationListResponse,
  InvitationOperationResult,
  OrganizationInvitation,
} from '../application/invitation-models'
import type { InvitationRepositoryPort } from '../application/ports'
import { assertCanAssignInvitationRole, assertPendingInvitation } from '../domain'

export class DrizzleInvitationsService implements InvitationRepositoryPort {
  private async checkOrganizationMembership(
    userId: string,
    organizationId: string,
    requiredRole?: string
  ): Promise<{ hasAccess: boolean; role?: string } | null> {
    const membership = await db
      .select({
        id: member.id,
        role: member.role,
        organizationId: member.organizationId,
        userId: member.userId,
      })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1)

    if (membership.length === 0) {
      return null
    }

    const userMembership = membership[0]

    if (requiredRole) {
      const roleHierarchy = { member: 1, admin: 2, owner: 3 }
      const userRoleLevel = roleHierarchy[userMembership.role as keyof typeof roleHierarchy] || 0
      const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

      if (userRoleLevel < requiredRoleLevel) {
        return null
      }
    }

    return { hasAccess: true, role: userMembership.role }
  }

  async getInvitations(
    organizationId: string,
    userId: string,
    options?: InvitationFilterOptions
  ): Promise<InvitationListResponse> {
    const membership = await this.checkOrganizationMembership(userId, organizationId, 'admin')

    if (!membership) {
      throw new Error('User is not a member of this organization')
    }

    const roleHierarchy = { member: 1, admin: 2, owner: 3 }
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0

    if (userRoleLevel < 2) {
      throw new Error('Insufficient permissions. Admin or Owner role required')
    }

    const {
      search,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options || {}

    const conditions = [eq(invitation.organizationId, organizationId)]

    let searchCondition: ReturnType<typeof or> | undefined
    if (search?.trim()) {
      const searchTerm = search.trim().toLowerCase()
      searchCondition = or(
        like(sql`lower(${invitation.email})`, `%${searchTerm}%`),
        like(sql`lower(${user.name})`, `%${searchTerm}%`)
      )
    }

    if (status?.trim() && status !== 'all') {
      if (status.trim() === 'empty') {
        conditions.push(eq(invitation.status, '__NEVER_EXISTS__'))
      } else {
        const statusList = status
          .trim()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)

        const hasArchived = statusList.includes('archived')
        const regularStatuses = statusList.filter((s) => s !== 'archived')

        if (hasArchived && regularStatuses.length > 0) {
          // Show both archived invitations AND non-archived with specific statuses
          conditions.push(
            or(
              eq(invitation.archived, true),
              and(
                eq(invitation.archived, false),
                regularStatuses.length === 1
                  ? eq(invitation.status, regularStatuses[0])
                  : inArray(invitation.status, regularStatuses)
              )
            )!
          )
        } else if (hasArchived) {
          conditions.push(eq(invitation.archived, true))
        } else {
          conditions.push(eq(invitation.archived, false))
          if (regularStatuses.length === 1) {
            conditions.push(eq(invitation.status, regularStatuses[0]))
          } else if (regularStatuses.length > 1) {
            conditions.push(inArray(invitation.status, regularStatuses))
          }
        }
      }
    } else {
      // Default: hide archived invitations when no status filter is provided
      conditions.push(eq(invitation.archived, false))
    }

    const offset = (page - 1) * limit
    const orderBy = sortOrder === 'asc' ? asc : desc

    let sortColumn:
      | typeof invitation.id
      | typeof invitation.email
      | typeof invitation.role
      | typeof invitation.status
      | typeof invitation.expiresAt
    switch (sortBy) {
      case 'email':
        sortColumn = invitation.email
        break
      case 'role':
        sortColumn = invitation.role
        break
      case 'status':
        sortColumn = invitation.status
        break
      case 'expiresAt':
        sortColumn = invitation.expiresAt
        break
      default:
        sortColumn = invitation.id
    }

    const whereConditions = searchCondition ? [...conditions, searchCondition] : conditions

    const invitations = await db
      .select({
        id: invitation.id,
        organizationId: invitation.organizationId,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        archived: invitation.archived,
        expiresAt: invitation.expiresAt,
        inviterId: invitation.inviterId,
        createdAt: sql`${invitation.id}`.as('createdAt'),
        inviterName: user.name,
        inviterEmail: user.email,
      })
      .from(invitation)
      .leftJoin(user, eq(invitation.inviterId, user.id))
      .where(and(...whereConditions))
      .orderBy(orderBy(sortColumn))
      .limit(limit)
      .offset(offset)

    const totalCountResult = await db
      .select({ count: sql`count(*)`.as('count') })
      .from(invitation)
      .leftJoin(user, eq(invitation.inviterId, user.id))
      .where(and(...whereConditions))

    const totalCount = Number(totalCountResult[0]?.count) || 0
    const totalPages = Math.ceil(totalCount / limit)

    const invitationsWithExpiry = invitations.map((invitation) => ({
      ...invitation,
      isExpired: new Date(invitation.expiresAt) < new Date(),
    }))

    return {
      invitations: invitationsWithExpiry,
      total: totalCount,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }
  }

  async getInvitationDetails(invitationId: string): Promise<OrganizationInvitation | null> {
    const invitationResult = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organizationId: invitation.organizationId,
        archived: invitation.archived,
        inviterId: invitation.inviterId,
        organization: {
          id: organization.id,
          name: organization.name,
          logo: organization.logo,
          brandColor: organization.brandColor,
        },
        inviter: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          dominantColor: user.dominantColor,
        },
      })
      .from(invitation)
      .innerJoin(organization, eq(invitation.organizationId, organization.id))
      .leftJoin(user, eq(invitation.inviterId, user.id))
      .where(eq(invitation.id, invitationId))
      .limit(1)

    if (invitationResult.length === 0) {
      return null
    }

    const invitationData = invitationResult[0]
    const isExpired = new Date(invitationData.expiresAt) < new Date()

    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, invitationData.email))
      .limit(1)

    const userExists = existingUser.length > 0

    const memberCountResult = await db
      .select({ count: sql`count(*)`.as('count') })
      .from(member)
      .where(eq(member.organizationId, invitationData.organizationId))

    const memberCount = Number(memberCountResult[0]?.count) || 0

    return {
      ...invitationData,
      isExpired,
      userExists,
      memberCount,
    } as OrganizationInvitation
  }

  async resendInvitation(invitationId: string, userId: string): Promise<InvitationOperationResult> {
    const invitationResult = await db
      .select({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          organizationId: invitation.organizationId,
          inviterId: invitation.inviterId,
        },
        organization: {
          id: organization.id,
          name: organization.name,
        },
        inviter: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(invitation)
      .innerJoin(organization, eq(invitation.organizationId, organization.id))
      .innerJoin(user, eq(invitation.inviterId, user.id))
      .where(eq(invitation.id, invitationId))
      .limit(1)

    if (invitationResult.length === 0) {
      throw new Error('Invitation not found')
    }

    const invitationData = invitationResult[0]

    const membership = await this.checkOrganizationMembership(
      userId,
      invitationData.organization.id,
      'admin'
    )

    if (!membership) {
      throw new Error('User is not a member of this organization')
    }

    const roleHierarchy = { member: 1, admin: 2, owner: 3 }
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0

    if (userRoleLevel < 2) {
      throw new Error('Insufficient permissions. Admin or Owner role required')
    }

    if (invitationData.invitation.status !== 'pending') {
      throw new Error('Invitation is not in pending status')
    }

    const existingMember = await db
      .select({ id: user.id })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, invitationData.organization.id),
          eq(user.email, invitationData.invitation.email)
        )
      )
      .limit(1)

    if (existingMember.length > 0) {
      throw new Error('User is already a member of this organization')
    }

    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7)

    await db
      .update(invitation)
      .set({ expiresAt: newExpiresAt })
      .where(eq(invitation.id, invitationId))

    const inviteLink = buildAuthLink({
      email: invitationData.invitation.email,
      redirectPath: `/invitation/${invitationData.invitation.id}`,
    })

    try {
      await EmailService.sendTemplatedEmail(
        EmailTemplate.ORGANIZATION_INVITATION,
        {
          username: invitationData.invitation.email.split('@')[0],
          organizationName: invitationData.organization.name,
          inviterName: invitationData.inviter.name,
          inviterEmail: invitationData.inviter.email,
          role: invitationData.invitation.role || 'member',
          inviteLink,
        },
        {
          to: invitationData.invitation.email,
          subject: `Reminder: Invitation to join ${invitationData.organization.name}`,
          organizationId: invitationData.organization.id,
        }
      )

      return {
        success: true,
        message: 'Invitation resent successfully',
        expiresAt: newExpiresAt,
      }
    } catch (error) {
      console.error('Error resending invitation email:', error)
      throw new Error('Failed to resend invitation email')
    }
  }

  async updateInvitationRole(
    invitationId: string,
    userId: string,
    newRole: string
  ): Promise<InvitationOperationResult> {
    const invitationResult = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        organizationId: invitation.organizationId,
      })
      .from(invitation)
      .where(eq(invitation.id, invitationId))
      .limit(1)

    if (invitationResult.length === 0) {
      throw new Error('Invitation not found')
    }

    const invitationData = invitationResult[0]

    const membership = await this.checkOrganizationMembership(
      userId,
      invitationData.organizationId,
      'admin'
    )

    if (!membership) {
      throw new Error('User is not a member of this organization')
    }

    const roleHierarchy = { member: 1, admin: 2, owner: 3 }
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0

    if (userRoleLevel < 2) {
      throw new Error('Insufficient permissions. Admin or Owner role required')
    }

    assertCanAssignInvitationRole(membership.role, newRole)

    assertPendingInvitation(invitationData.status, 'Cannot update role of non-pending invitation')

    const existingMember = await db
      .select({ id: user.id })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, invitationData.organizationId),
          eq(user.email, invitationData.email)
        )
      )
      .limit(1)

    if (existingMember.length > 0) {
      throw new Error('User is already a member of this organization')
    }

    await db.update(invitation).set({ role: newRole }).where(eq(invitation.id, invitationId))

    return {
      success: true,
      message: 'Invitation role updated successfully',
      previousRole: invitationData.role,
      newRole,
    }
  }

  async archiveInvitations(
    invitationIds: string[],
    userId: string,
    organizationId: string
  ): Promise<InvitationOperationResult> {
    if (!invitationIds.length) {
      throw new Error('No invitation IDs provided')
    }

    const membership = await this.checkOrganizationMembership(userId, organizationId, 'admin')

    if (!membership) {
      throw new Error('User is not a member of this organization')
    }

    const roleHierarchy = { member: 1, admin: 2, owner: 3 }
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0

    if (userRoleLevel < 2) {
      throw new Error('Insufficient permissions. Admin or Owner role required')
    }

    const invitationsToArchive = await db
      .select({
        id: invitation.id,
        status: invitation.status,
        archived: invitation.archived,
      })
      .from(invitation)
      .where(
        and(inArray(invitation.id, invitationIds), eq(invitation.organizationId, organizationId))
      )

    if (invitationsToArchive.length !== invitationIds.length) {
      throw new Error('Some invitations not found or do not belong to this organization')
    }

    const alreadyArchived = invitationsToArchive.filter((inv) => inv.archived)
    if (alreadyArchived.length > 0) {
      throw new Error('Some invitations are already archived')
    }

    await db
      .update(invitation)
      .set({ archived: true })
      .where(
        and(inArray(invitation.id, invitationIds), eq(invitation.organizationId, organizationId))
      )

    return {
      success: true,
      message:
        invitationIds.length === 1
          ? 'Invitation successfully archived'
          : 'Invitations successfully archived',
      archivedCount: invitationIds.length,
    }
  }

  async unarchiveInvitations(
    invitationIds: string[],
    userId: string,
    organizationId: string
  ): Promise<InvitationOperationResult> {
    if (!invitationIds.length) {
      throw new Error('No invitation IDs provided')
    }

    const membership = await this.checkOrganizationMembership(userId, organizationId, 'admin')

    if (!membership) {
      throw new Error('User is not a member of this organization')
    }

    const roleHierarchy = { member: 1, admin: 2, owner: 3 }
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0

    if (userRoleLevel < 2) {
      throw new Error('Insufficient permissions. Admin or Owner role required')
    }

    const invitationsToUnarchive = await db
      .select({
        id: invitation.id,
        archived: invitation.archived,
      })
      .from(invitation)
      .where(
        and(inArray(invitation.id, invitationIds), eq(invitation.organizationId, organizationId))
      )

    if (invitationsToUnarchive.length !== invitationIds.length) {
      throw new Error('Some invitations not found or do not belong to this organization')
    }

    const notArchived = invitationsToUnarchive.filter((inv) => !inv.archived)
    if (notArchived.length > 0) {
      throw new Error('Some invitations are not archived')
    }

    await db
      .update(invitation)
      .set({ archived: false })
      .where(
        and(inArray(invitation.id, invitationIds), eq(invitation.organizationId, organizationId))
      )

    return {
      success: true,
      message:
        invitationIds.length === 1
          ? 'Invitation successfully unarchived'
          : 'Invitations successfully unarchived',
      unarchivedCount: invitationIds.length,
    }
  }

  async cancelInvitation(invitationId: string, userId: string): Promise<InvitationOperationResult> {
    const invitationResult = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        organizationId: invitation.organizationId,
      })
      .from(invitation)
      .where(eq(invitation.id, invitationId))
      .limit(1)

    if (invitationResult.length === 0) {
      throw new Error('Invitation not found')
    }

    const invitationData = invitationResult[0]

    const membership = await this.checkOrganizationMembership(
      userId,
      invitationData.organizationId,
      'admin'
    )

    if (!membership) {
      throw new Error('User is not a member of this organization')
    }

    const roleHierarchy = { member: 1, admin: 2, owner: 3 }
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0

    if (userRoleLevel < 2) {
      throw new Error('Insufficient permissions. Admin or Owner role required')
    }

    assertPendingInvitation(invitationData.status, 'Only pending invitations can be canceled')

    await db.update(invitation).set({ status: 'canceled' }).where(eq(invitation.id, invitationId))

    return {
      success: true,
      message: 'Invitation canceled successfully',
    }
  }

  async cancelInvitations(
    invitationIds: string[],
    userId: string,
    organizationId: string
  ): Promise<InvitationOperationResult> {
    if (!invitationIds.length) {
      throw new Error('No invitation IDs provided')
    }

    const membership = await this.checkOrganizationMembership(userId, organizationId, 'admin')

    if (!membership) {
      throw new Error('User is not a member of this organization')
    }

    const roleHierarchy = { member: 1, admin: 2, owner: 3 }
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0

    if (userRoleLevel < 2) {
      throw new Error('Insufficient permissions. Admin or Owner role required')
    }

    const invitationsToCancel = await db
      .select({
        id: invitation.id,
        status: invitation.status,
      })
      .from(invitation)
      .where(
        and(inArray(invitation.id, invitationIds), eq(invitation.organizationId, organizationId))
      )

    if (invitationsToCancel.length !== invitationIds.length) {
      throw new Error('Some invitations not found or do not belong to this organization')
    }

    const nonPendingInvitations = invitationsToCancel.filter((inv) => inv.status !== 'pending')
    if (nonPendingInvitations.length > 0) {
      throw new Error('Only pending invitations can be canceled')
    }

    await db
      .update(invitation)
      .set({ status: 'canceled' })
      .where(
        and(inArray(invitation.id, invitationIds), eq(invitation.organizationId, organizationId))
      )

    return {
      success: true,
      message:
        invitationIds.length === 1
          ? 'Invitation canceled successfully'
          : 'Invitations canceled successfully',
      canceledCount: invitationIds.length,
    }
  }

  async createInvitation(command: CreateInvitationCommand): Promise<InvitationOperationResult> {
    const { email, role, organizationId, inviterId } = command
    const membership = await this.checkOrganizationMembership(inviterId, organizationId, 'admin')

    if (!membership) {
      throw new Error('User is not a member of this organization')
    }

    const roleHierarchy = { member: 1, admin: 2, owner: 3 }
    const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0

    if (userRoleLevel < 2) {
      throw new Error('Insufficient permissions. Admin or Owner role required')
    }

    assertCanAssignInvitationRole(
      membership.role,
      role,
      'Admin cannot invite users with owner role'
    )

    const existingMember = await db
      .select({ id: user.id })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(eq(member.organizationId, organizationId), eq(user.email, email)))
      .limit(1)

    if (existingMember.length > 0) {
      throw new Error('User is already a member of this organization')
    }

    const organizationData = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    if (organizationData.length === 0) {
      throw new Error('Organization not found')
    }

    const inviterData = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, inviterId))
      .limit(1)

    if (inviterData.length === 0) {
      throw new Error('Inviter not found')
    }

    const invitationId = nanoid(32)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await db.insert(invitation).values({
      id: invitationId,
      organizationId,
      email,
      role,
      status: 'pending',
      archived: false,
      expiresAt,
      inviterId,
    })

    const slug = organizationData[0].slug
    if (!slug) {
      throw new Error(`Organization ${organizationId} has no slug`)
    }

    const inviteLink = buildAuthLink({
      email,
      redirectPath: `/invitation/${invitationId}`,
    })

    try {
      await EmailService.sendTemplatedEmail(
        EmailTemplate.ORGANIZATION_INVITATION,
        {
          username: email.split('@')[0],
          organizationName: organizationData[0].name,
          inviterName: inviterData[0].name,
          inviterEmail: inviterData[0].email,
          role,
          inviteLink,
        },
        {
          to: email,
          subject: `Invitation to join ${organizationData[0].name}`,
          organizationId,
        }
      )

      return {
        success: true,
        message: 'Invitation sent successfully',
        invitationId,
      }
    } catch (error) {
      await db.delete(invitation).where(eq(invitation.id, invitationId))
      console.error('Error sending invitation email:', error)
      throw new Error('Failed to send invitation email')
    }
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
    userEmail: string
  ): Promise<AcceptInvitationResult> {
    const [invitationData] = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organizationId: invitation.organizationId,
        organizationName: organization.name,
        organizationSlug: organization.slug,
      })
      .from(invitation)
      .innerJoin(organization, eq(invitation.organizationId, organization.id))
      .where(eq(invitation.id, invitationId))
      .limit(1)

    if (!invitationData) {
      throw new Error('Invitation not found')
    }

    if (invitationData.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('This invitation belongs to a different email address')
    }

    if (invitationData.status === 'accepted') {
      return {
        success: true,
        message: 'Invitation already accepted',
        invitation: {
          id: invitationData.id,
          organizationId: invitationData.organizationId,
          status: 'accepted',
        },
        organization: {
          id: invitationData.organizationId,
          slug: invitationData.organizationSlug,
          name: invitationData.organizationName,
        },
      }
    }

    if (invitationData.status !== 'pending') {
      throw new Error('Invitation is not in pending status')
    }

    if (new Date(invitationData.expiresAt) < new Date()) {
      throw new Error('Invitation has expired')
    }

    const [existingMembership] = await db
      .select({ id: member.id, organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1)

    if (existingMembership && existingMembership.organizationId !== invitationData.organizationId) {
      throw new Error('User is already a member of another organization')
    }

    const memberWasAdded = !existingMembership

    await db.transaction(async (tx) => {
      if (!existingMembership) {
        await tx.insert(member).values({
          id: crypto.randomUUID(),
          organizationId: invitationData.organizationId,
          userId,
          role: invitationData.role || 'member',
          createdAt: new Date(),
        })
      }

      await tx.update(invitation).set({ status: 'accepted' }).where(eq(invitation.id, invitationId))
    })

    if (memberWasAdded) {
      void subscriptionApplicationService
        .increaseSeatCount(invitationData.organizationId)
        .catch((error) => {
          console.error(
            '[AcceptInvitation] Failed to increase seat count for org',
            invitationData.organizationId,
            error
          )
        })
    }

    try {
      await conversationService.addMemberToAllOrganizationConversations(
        invitationData.organizationId,
        userId
      )

      const teamConversation = await db
        .select({ id: conversation.id })
        .from(conversation)
        .where(
          and(
            eq(conversation.organizationId, invitationData.organizationId),
            eq(conversation.isTeamChat, true)
          )
        )
        .limit(1)

      if (teamConversation.length > 0) {
        await conversationService.pinConversation(teamConversation[0].id, userId)
      }
    } catch (error) {
      console.error(
        'Failed to add member to organization conversations after accepting invitation:',
        error
      )
    }

    return {
      success: true,
      message: 'Invitation accepted successfully',
      invitation: {
        id: invitationData.id,
        organizationId: invitationData.organizationId,
        status: 'accepted',
      },
      organization: {
        id: invitationData.organizationId,
        slug: invitationData.organizationSlug,
        name: invitationData.organizationName,
      },
    }
  }
}
