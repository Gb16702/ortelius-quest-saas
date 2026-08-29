/**
 * Seed two test users and a shared conversation for VOIP e2e tests.
 * Idempotent — safe to run multiple times.
 *
 * Run with: docker exec ortelius-api bun run src/scripts/seed-e2e-voip.ts
 */
import { and, eq } from 'drizzle-orm'
import { db } from '../infrastructure/database'
import { member, organization, user } from '../infrastructure/database/db/schemas/auth-schema'
import {
  conversation,
  conversationParticipant,
} from '../infrastructure/database/db/schemas/chat-schema'

// REQUESTER: external user (NOT a member of the org). Calls the org via
// `initiateOrgCall` (calleeId: null) — any online org member can accept.
const REQUESTER = {
  id: 'e2e-voip-requester-id',
  email: 'e2e-requester@test.local',
  name: 'E2E Requester',
}
// ORG_MEMBER: member of ORG_ID. When THEY initiate, calleeId is the
// requester's id (1-to-1, only that user can accept).
const ORG_MEMBER = {
  id: 'e2e-voip-org-member-id',
  email: 'e2e-org-member@test.local',
  name: 'E2E Org Member',
}
type SeedUser = typeof REQUESTER

const ORG_ID = 'e2e-voip-test-org'
const CONV_ID = '33333333-3333-4333-8333-333333333333'

async function upsertOrg() {
  const existing = await db.select().from(organization).where(eq(organization.id, ORG_ID)).limit(1)
  if (existing.length > 0) {
    console.log(`  org ${ORG_ID} already exists`)
    return
  }
  await db.insert(organization).values({
    id: ORG_ID,
    name: 'E2E VOIP Test Org',
    slug: 'e2e-voip-test',
    createdAt: new Date(),
  })
  console.log(`  org ${ORG_ID} created`)
}

async function upsertUser(u: SeedUser) {
  const existing = await db.select().from(user).where(eq(user.id, u.id)).limit(1)
  if (existing.length > 0) {
    console.log(`  user ${u.id} already exists`)
    return
  }
  await db.insert(user).values({
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: true,
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  console.log(`  user ${u.id} created`)
}

async function upsertConversation() {
  const existing = await db.select().from(conversation).where(eq(conversation.id, CONV_ID)).limit(1)
  if (existing.length > 0) {
    console.log(`  conversation ${CONV_ID} already exists`)
    return
  }
  await db.insert(conversation).values({
    id: CONV_ID,
    createdBy: REQUESTER.id,
    organizationId: ORG_ID,
    name: 'E2E VOIP Test Conversation',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as typeof conversation.$inferInsert)
  console.log(`  conversation ${CONV_ID} created`)
}

async function upsertParticipant(userId: string) {
  const existing = await db
    .select()
    .from(conversationParticipant)
    .where(
      and(
        eq(conversationParticipant.userId, userId),
        eq(conversationParticipant.conversationId, CONV_ID)
      )
    )
    .limit(1)
  if (existing.length > 0) {
    console.log(`  participant ${userId} already in conv`)
    return
  }
  await db.insert(conversationParticipant).values({
    id: crypto.randomUUID(),
    conversationId: CONV_ID,
    userId,
    joinedAt: new Date(),
  } as typeof conversationParticipant.$inferInsert)
  console.log(`  participant ${userId} added to conv`)
}

async function upsertOrgMember(userId: string) {
  const existing = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, ORG_ID)))
    .limit(1)
  if (existing.length > 0) {
    console.log(`  member ${userId} already in org`)
    return
  }
  await db.insert(member).values({
    id: crypto.randomUUID(),
    userId,
    organizationId: ORG_ID,
    role: 'member',
    createdAt: new Date(),
  } as typeof member.$inferInsert)
  console.log(`  member ${userId} added to org`)
}

async function purgeLegacyParticipants() {
  // Older versions of this script seeded `e2e-voip-caller-id` and
  // `e2e-voip-callee-id` as conversation participants. They linger in the
  // DB and break the test's "find the other participant" logic by adding
  // unrelated users to the participants list. Drop them.
  const legacyIds = ['e2e-voip-caller-id', 'e2e-voip-callee-id']
  for (const userId of legacyIds) {
    await db
      .delete(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.userId, userId),
          eq(conversationParticipant.conversationId, CONV_ID)
        )
      )
  }
}

async function main() {
  console.log('Seeding E2E VOIP fixtures...')
  await upsertOrg()
  await upsertUser(REQUESTER)
  await upsertUser(ORG_MEMBER)
  await upsertConversation()
  await purgeLegacyParticipants()
  // Both are participants of the conversation (so chat works both ways).
  await upsertParticipant(REQUESTER.id)
  await upsertParticipant(ORG_MEMBER.id)
  // Only the org member is a member of the org. The requester is external.
  // (This matches production: a requester opens a request with an org —
  // they're not part of that org.)
  await upsertOrgMember(ORG_MEMBER.id)
  console.log('Done. Test user IDs:')
  console.log(`  REQUESTER (external):  ${REQUESTER.id}`)
  console.log(`  ORG_MEMBER:            ${ORG_MEMBER.id}`)
  console.log(`  CONV:                  ${CONV_ID}`)
  console.log(`  ORG:                   ${ORG_ID}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
