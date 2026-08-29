import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { conversationApplicationService as conversationService } from '../domains/messaging/conversation/conversation.application'
import { db } from '../infrastructure/database'
import { member, organization } from '../infrastructure/database/db/schemas/auth-schema'
import {
  conversation,
  conversationParticipant,
} from '../infrastructure/database/db/schemas/chat-schema'

const DRY_RUN = process.argv.includes('--dry-run')

interface OrgSummary {
  id: string
  name: string
  memberCount: number
  hadTeamChat: boolean
  createdTeamChat: boolean
  membersAdded: number
  membersPinned: number
  error?: string
}

async function backfillTeamChats(): Promise<void> {
  console.log(
    `\n${DRY_RUN ? '[DRY RUN] ' : ''}Backfilling team chats for existing organizations...\n`
  )

  const allOrganizations = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)

  console.log(`Found ${allOrganizations.length} organization(s)\n`)

  const summaries: OrgSummary[] = []

  for (const org of allOrganizations) {
    const summary: OrgSummary = {
      id: org.id,
      name: org.name,
      memberCount: 0,
      hadTeamChat: false,
      createdTeamChat: false,
      membersAdded: 0,
      membersPinned: 0,
    }

    try {
      const orgMembers = await db
        .select({ userId: member.userId, role: member.role })
        .from(member)
        .where(eq(member.organizationId, org.id))

      summary.memberCount = orgMembers.length

      if (orgMembers.length === 0) {
        console.log(`- "${org.name}": no members, skipped`)
        summaries.push(summary)
        continue
      }

      const existingTeamChat = await db
        .select({ id: conversation.id })
        .from(conversation)
        .where(and(eq(conversation.organizationId, org.id), eq(conversation.isTeamChat, true)))
        .limit(1)

      summary.hadTeamChat = existingTeamChat.length > 0

      const owner = orgMembers.find((m) => m.role === 'owner')
      const creatorId = owner?.userId ?? orgMembers[0].userId

      let teamChatId: string

      if (summary.hadTeamChat) {
        teamChatId = existingTeamChat[0].id
      } else if (DRY_RUN) {
        teamChatId = '<would-create>'
        summary.createdTeamChat = true
      } else {
        teamChatId = await conversationService.createTeamConversation(org.id, creatorId)
        summary.createdTeamChat = true
      }

      const existingParticipants =
        teamChatId === '<would-create>'
          ? []
          : await db
              .select({ userId: conversationParticipant.userId })
              .from(conversationParticipant)
              .where(eq(conversationParticipant.conversationId, teamChatId))

      const existingParticipantIds = new Set(existingParticipants.map((p) => p.userId))

      for (const orgMember of orgMembers) {
        const isAlreadyParticipant = existingParticipantIds.has(orgMember.userId)

        if (!isAlreadyParticipant) {
          if (!DRY_RUN) {
            await conversationService.addMemberToTeamChat(org.id, orgMember.userId)
          }
          summary.membersAdded++
        }

        if (teamChatId !== '<would-create>') {
          const participant = await db
            .select({ isPinned: conversationParticipant.isPinned })
            .from(conversationParticipant)
            .where(
              and(
                eq(conversationParticipant.conversationId, teamChatId),
                eq(conversationParticipant.userId, orgMember.userId)
              )
            )
            .limit(1)

          const needsPin = !participant[0]?.isPinned

          if (needsPin) {
            if (!DRY_RUN) {
              await conversationService.pinConversation(teamChatId, orgMember.userId)
            }
            summary.membersPinned++
          }
        } else {
          summary.membersPinned++
        }
      }

      const action = summary.hadTeamChat ? 'exists' : 'created'
      console.log(
        `- "${org.name}" (${orgMembers.length} member(s)): team chat ${action}, +${summary.membersAdded} added, +${summary.membersPinned} pinned`
      )
    } catch (error) {
      summary.error = error instanceof Error ? error.message : String(error)
      console.error(`- "${org.name}": ERROR — ${summary.error}`)
    }

    summaries.push(summary)
  }

  const stats = summaries.reduce(
    (acc, s) => {
      if (s.error) acc.errors++
      else if (s.createdTeamChat) acc.created++
      else if (s.hadTeamChat) acc.alreadyExisted++
      acc.totalAdded += s.membersAdded
      acc.totalPinned += s.membersPinned
      return acc
    },
    { created: 0, alreadyExisted: 0, errors: 0, totalAdded: 0, totalPinned: 0 }
  )

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Summary:`)
  console.log(`  Total orgs:          ${summaries.length}`)
  console.log(`  Team chats created:  ${stats.created}`)
  console.log(`  Already existed:     ${stats.alreadyExisted}`)
  console.log(`  Members added:       ${stats.totalAdded}`)
  console.log(`  Conversations pinned: ${stats.totalPinned}`)
  console.log(`  Errors:              ${stats.errors}`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes were applied. Re-run without --dry-run to apply.')
  }
}

backfillTeamChats()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
