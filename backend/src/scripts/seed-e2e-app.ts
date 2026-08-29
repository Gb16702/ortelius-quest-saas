/**
 * Seed deterministic app-level fixtures for frontend E2E tests.
 *
 * The API auth middleware already supports `test-bypass:<userId>` when
 * ENABLE_TEST_AUTH_BYPASS=true in development/test. This script makes those
 * deterministic users real database records instead of weakening auth.
 *
 * Run with: bun run seed:e2e
 * Docker:   docker exec ortelius-api bun run seed:e2e
 */
import { and, eq } from 'drizzle-orm'
import { db } from '../infrastructure/database'
import {
  member,
  organization,
  subscription,
  user as userTable,
} from '../infrastructure/database/db/schemas/auth-schema'
import { category } from '../infrastructure/database/db/schemas/category-schema'
import {
  conversation,
  conversationParticipant,
} from '../infrastructure/database/db/schemas/chat-schema'
import { organizationCategories } from '../infrastructure/database/db/schemas/organization-categories-schema'
import { organizationServices } from '../infrastructure/database/db/schemas/organization-services-schema'
import { service } from '../infrastructure/database/db/schemas/services-schema'

type E2EAccount = {
  id: string
  email: string
  name: string
}

const E2E_ORGANIZATION = {
  id: 'e2e-test-org',
  name: 'E2E Test Org',
  slug: 'e2e-test-org',
  tagline: 'Deterministic organization for frontend E2E tests.',
  overview:
    'This organization is seeded locally for Playwright flows that exercise auth, requests, chat, members, and billing.',
  website: 'https://example.test/e2e-test-org',
  stripeCustomerId: 'cus_e2e_test_org',
} as const

const E2E_ACCOUNTS = {
  admin: {
    id: 'e2e-admin-user-id',
    email: 'e2e-admin@test.local',
    name: 'E2E Admin',
  },
  member: {
    id: 'e2e-member-user-id',
    email: 'e2e-member@test.local',
    name: 'E2E Member',
  },
  guest: {
    id: 'e2e-guest-user-id',
    email: 'e2e-guest@test.local',
    name: 'E2E Guest',
  },
} satisfies Record<string, E2EAccount>

const E2E_CATEGORY = {
  id: 'e2e-cargo-category',
  name: 'E2E Cargo',
  slug: 'e2e-cargo',
} as const

const E2E_SERVICE = {
  id: 'e2e-freight-service',
  name: 'E2E Freight Forwarding',
  slug: 'e2e-freight-forwarding',
  type: 'logistics' as const,
} as const

const E2E_SHARED_CONVERSATION_ID = '44444444-4444-4444-8444-444444444444'
const E2E_SUBSCRIPTION_ID = 'e2e-test-subscription'

async function assertUserEmailAvailable(account: E2EAccount) {
  const rows = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, account.email))
    .limit(1)

  const existing = rows[0]
  if (existing && existing.id !== account.id) {
    throw new Error(
      `Cannot seed ${account.email}: email already belongs to user ${existing.id}, expected ${account.id}.`
    )
  }
}

async function assertOrganizationSlugAvailable() {
  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, E2E_ORGANIZATION.slug))
    .limit(1)

  const existing = rows[0]
  if (existing && existing.id !== E2E_ORGANIZATION.id) {
    throw new Error(
      `Cannot seed ${E2E_ORGANIZATION.slug}: slug already belongs to organization ${existing.id}, expected ${E2E_ORGANIZATION.id}.`
    )
  }
}

async function upsertUser(account: E2EAccount) {
  await assertUserEmailAvailable(account)

  const now = new Date()
  const rows = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, account.id))
    .limit(1)

  if (rows.length === 0) {
    await db.insert(userTable).values({
      id: account.id,
      email: account.email,
      name: account.name,
      emailVerified: true,
      role: 'member',
      createdAt: now,
      updatedAt: now,
    })
    console.log(`  user ${account.id} created`)
    return
  }

  await db
    .update(userTable)
    .set({
      email: account.email,
      name: account.name,
      emailVerified: true,
      role: 'member',
      updatedAt: now,
    })
    .where(eq(userTable.id, account.id))
  console.log(`  user ${account.id} updated`)
}

async function upsertOrganization() {
  await assertOrganizationSlugAvailable()

  const now = new Date()
  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, E2E_ORGANIZATION.id))
    .limit(1)

  const values = {
    name: E2E_ORGANIZATION.name,
    slug: E2E_ORGANIZATION.slug,
    tagline: E2E_ORGANIZATION.tagline,
    overview: E2E_ORGANIZATION.overview,
    website: E2E_ORGANIZATION.website,
    status: 'active',
    stripeCustomerId: E2E_ORGANIZATION.stripeCustomerId,
  }

  if (rows.length === 0) {
    await db.insert(organization).values({
      id: E2E_ORGANIZATION.id,
      ...values,
      createdAt: now,
    })
    console.log(`  organization ${E2E_ORGANIZATION.id} created`)
    return
  }

  await db.update(organization).set(values).where(eq(organization.id, E2E_ORGANIZATION.id))
  console.log(`  organization ${E2E_ORGANIZATION.id} updated`)
}

async function upsertMembership(input: { userId: string; role: 'admin' | 'member' }) {
  const rows = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.userId, input.userId))
    .limit(1)

  if (rows.length === 0) {
    await db.insert(member).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      organizationId: E2E_ORGANIZATION.id,
      role: input.role,
      createdAt: new Date(),
    })
    console.log(`  membership ${input.userId} -> ${input.role} created`)
    return
  }

  await db
    .update(member)
    .set({
      organizationId: E2E_ORGANIZATION.id,
      role: input.role,
    })
    .where(eq(member.id, rows[0].id))
  console.log(`  membership ${input.userId} -> ${input.role} updated`)
}

async function ensureGuestHasNoMembership() {
  await db.delete(member).where(eq(member.userId, E2E_ACCOUNTS.guest.id))
  console.log(`  guest membership cleared for ${E2E_ACCOUNTS.guest.id}`)
}

async function upsertCategory() {
  const now = new Date()
  const rows = await db
    .select({ id: category.id })
    .from(category)
    .where(eq(category.id, E2E_CATEGORY.id))
    .limit(1)

  if (rows.length === 0) {
    await db.insert(category).values({
      ...E2E_CATEGORY,
      createdAt: now,
      updatedAt: now,
    })
    console.log(`  category ${E2E_CATEGORY.id} created`)
    return
  }

  await db
    .update(category)
    .set({
      name: E2E_CATEGORY.name,
      slug: E2E_CATEGORY.slug,
      updatedAt: now,
    })
    .where(eq(category.id, E2E_CATEGORY.id))
  console.log(`  category ${E2E_CATEGORY.id} updated`)
}

async function upsertService() {
  const now = new Date()
  const rows = await db
    .select({ id: service.id })
    .from(service)
    .where(eq(service.id, E2E_SERVICE.id))
    .limit(1)

  if (rows.length === 0) {
    await db.insert(service).values({
      ...E2E_SERVICE,
      createdAt: now,
      updatedAt: now,
    })
    console.log(`  service ${E2E_SERVICE.id} created`)
    return
  }

  await db
    .update(service)
    .set({
      name: E2E_SERVICE.name,
      slug: E2E_SERVICE.slug,
      type: E2E_SERVICE.type,
      updatedAt: now,
    })
    .where(eq(service.id, E2E_SERVICE.id))
  console.log(`  service ${E2E_SERVICE.id} updated`)
}

async function ensureOrganizationCategory() {
  const rows = await db
    .select({ categoryId: organizationCategories.categoryId })
    .from(organizationCategories)
    .where(
      and(
        eq(organizationCategories.organizationId, E2E_ORGANIZATION.id),
        eq(organizationCategories.categoryId, E2E_CATEGORY.id)
      )
    )
    .limit(1)

  if (rows.length > 0) {
    console.log(`  organization category ${E2E_CATEGORY.id} already linked`)
    return
  }

  await db.insert(organizationCategories).values({
    organizationId: E2E_ORGANIZATION.id,
    categoryId: E2E_CATEGORY.id,
    createdAt: new Date(),
  })
  console.log(`  organization category ${E2E_CATEGORY.id} linked`)
}

async function ensureOrganizationService() {
  const rows = await db
    .select({ serviceId: organizationServices.serviceId })
    .from(organizationServices)
    .where(
      and(
        eq(organizationServices.organizationId, E2E_ORGANIZATION.id),
        eq(organizationServices.serviceId, E2E_SERVICE.id)
      )
    )
    .limit(1)

  if (rows.length > 0) {
    await db
      .update(organizationServices)
      .set({ price: 1200, currency: 'EUR' })
      .where(
        and(
          eq(organizationServices.organizationId, E2E_ORGANIZATION.id),
          eq(organizationServices.serviceId, E2E_SERVICE.id)
        )
      )
    console.log(`  organization service ${E2E_SERVICE.id} updated`)
    return
  }

  await db.insert(organizationServices).values({
    organizationId: E2E_ORGANIZATION.id,
    serviceId: E2E_SERVICE.id,
    price: 1200,
    currency: 'EUR',
    createdAt: new Date(),
  })
  console.log(`  organization service ${E2E_SERVICE.id} linked`)
}

async function upsertSharedConversation() {
  const now = new Date()
  const rows = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(eq(conversation.id, E2E_SHARED_CONVERSATION_ID))
    .limit(1)

  const values = {
    name: 'E2E Shared Conversation',
    description: 'Shared conversation for admin/member chat E2E tests.',
    createdBy: E2E_ACCOUNTS.admin.id,
    organizationId: E2E_ORGANIZATION.id,
    updatedAt: now,
    isTeamChat: false,
  }

  if (rows.length === 0) {
    await db.insert(conversation).values({
      id: E2E_SHARED_CONVERSATION_ID,
      ...values,
      createdAt: now,
    })
    console.log(`  conversation ${E2E_SHARED_CONVERSATION_ID} created`)
  } else {
    await db.update(conversation).set(values).where(eq(conversation.id, E2E_SHARED_CONVERSATION_ID))
    console.log(`  conversation ${E2E_SHARED_CONVERSATION_ID} updated`)
  }

  await Promise.all([
    upsertConversationParticipant(E2E_ACCOUNTS.admin.id, 'admin'),
    upsertConversationParticipant(E2E_ACCOUNTS.member.id, 'member'),
  ])
}

async function upsertConversationParticipant(userId: string, role: 'admin' | 'member') {
  const rows = await db
    .select({ id: conversationParticipant.id })
    .from(conversationParticipant)
    .where(
      and(
        eq(conversationParticipant.conversationId, E2E_SHARED_CONVERSATION_ID),
        eq(conversationParticipant.userId, userId)
      )
    )
    .limit(1)

  if (rows.length === 0) {
    await db.insert(conversationParticipant).values({
      id: crypto.randomUUID(),
      conversationId: E2E_SHARED_CONVERSATION_ID,
      userId,
      role,
      joinedAt: new Date(),
      leftAt: null,
    })
    console.log(`  conversation participant ${userId} created`)
    return
  }

  await db
    .update(conversationParticipant)
    .set({ role, leftAt: null })
    .where(eq(conversationParticipant.id, rows[0].id))
  console.log(`  conversation participant ${userId} updated`)
}

async function upsertSubscription() {
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const rows = await db
    .select({ id: subscription.id })
    .from(subscription)
    .where(eq(subscription.id, E2E_SUBSCRIPTION_ID))
    .limit(1)

  const values = {
    plan: 'professional',
    referenceId: E2E_ORGANIZATION.id,
    stripeCustomerId: E2E_ORGANIZATION.stripeCustomerId,
    stripeSubscriptionId: null,
    status: 'active',
    periodStart: now,
    periodEnd,
    cancelAtPeriodEnd: false,
    seats: '2',
    billingModel: 'per-seat',
    trialStart: null,
    trialEnd: null,
    updatedAt: now,
  }

  if (rows.length === 0) {
    await db.insert(subscription).values({
      id: E2E_SUBSCRIPTION_ID,
      ...values,
      createdAt: now,
    })
    console.log(`  subscription ${E2E_SUBSCRIPTION_ID} created`)
    return
  }

  await db.update(subscription).set(values).where(eq(subscription.id, E2E_SUBSCRIPTION_ID))
  console.log(`  subscription ${E2E_SUBSCRIPTION_ID} updated`)
}

async function seedE2EApp() {
  console.log('Seeding E2E app fixtures...')

  await upsertUser(E2E_ACCOUNTS.admin)
  await upsertUser(E2E_ACCOUNTS.member)
  await upsertUser(E2E_ACCOUNTS.guest)
  await upsertOrganization()
  await upsertMembership({ userId: E2E_ACCOUNTS.admin.id, role: 'admin' })
  await upsertMembership({ userId: E2E_ACCOUNTS.member.id, role: 'member' })
  await ensureGuestHasNoMembership()
  await upsertCategory()
  await upsertService()
  await ensureOrganizationCategory()
  await ensureOrganizationService()
  await upsertSharedConversation()
  await upsertSubscription()

  console.log('\n=== E2E Seed Summary ===')
  console.log(`Organization: ${E2E_ORGANIZATION.name} (slug: ${E2E_ORGANIZATION.slug})`)
  console.log(`Admin token:  test-bypass:${E2E_ACCOUNTS.admin.id}`)
  console.log(`Member token: test-bypass:${E2E_ACCOUNTS.member.id}`)
  console.log(`Guest token:  test-bypass:${E2E_ACCOUNTS.guest.id}`)
  console.log(`Chat:         ${E2E_SHARED_CONVERSATION_ID}`)
  console.log('========================\n')
}

if (require.main === module) {
  seedE2EApp()
    .then(() => {
      console.log('E2E app fixture seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('E2E app fixture seeding failed:', error)
      process.exit(1)
    })
}

export { seedE2EApp }
