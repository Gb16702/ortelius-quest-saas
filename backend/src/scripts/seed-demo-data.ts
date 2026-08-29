import 'dotenv/config'
import { and, eq, inArray, like } from 'drizzle-orm'
import { conversationApplicationService as conversationService } from '../domains/messaging/conversation/conversation.application'
import { requestsApplicationService } from '../domains/requests/requests.application'
import { db } from '../infrastructure/database'
import {
  anonymousUser,
  invitation,
  member,
  organization,
  user,
} from '../infrastructure/database/db/schemas/auth-schema'
import { category } from '../infrastructure/database/db/schemas/category-schema'
import {
  conversation,
  conversationParticipant,
  message,
} from '../infrastructure/database/db/schemas/chat-schema'
import { organizationCategories } from '../infrastructure/database/db/schemas/organization-categories-schema'
import { organizationServices } from '../infrastructure/database/db/schemas/organization-services-schema'
import {
  cargoDetails,
  dimensions,
  request,
} from '../infrastructure/database/db/schemas/request-schema'
import { service } from '../infrastructure/database/db/schemas/services-schema'

const DEMO_PREFIX = 'demo-'
const DEMO_EMAIL_DOMAIN = 'ortelius-test.invalid'

const DEMO_REQUESTERS = [
  {
    name: 'Sophie Martin',
    email: `${DEMO_PREFIX}sophie.martin@${DEMO_EMAIL_DOMAIN}`,
    isGuest: false,
  },
  {
    name: 'Lucas Dubois',
    email: `${DEMO_PREFIX}lucas.dubois@${DEMO_EMAIL_DOMAIN}`,
    isGuest: false,
  },
  { name: 'Chloé Moreau', email: `${DEMO_PREFIX}chloe.moreau@${DEMO_EMAIL_DOMAIN}`, isGuest: true },
]

const DEMO_MEMBERS = [
  {
    name: 'Marie Lefevre',
    email: `${DEMO_PREFIX}marie.lefevre@${DEMO_EMAIL_DOMAIN}`,
    role: 'member',
  },
  {
    name: 'Thomas Girard',
    email: `${DEMO_PREFIX}thomas.girard@${DEMO_EMAIL_DOMAIN}`,
    role: 'member',
  },
]

const DEMO_INVITATIONS = [
  { email: `${DEMO_PREFIX}jean.dupont@${DEMO_EMAIL_DOMAIN}`, role: 'member' },
  { email: `${DEMO_PREFIX}claire.rousseau@${DEMO_EMAIL_DOMAIN}`, role: 'admin' },
]

function generateId(): string {
  return crypto.randomUUID()
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

async function loadDemoData(slug: string) {
  console.log(`Loading demo data for organization with slug: ${slug}`)

  const [org] = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1)

  if (!org) {
    console.error(`Organization with slug "${slug}" not found`)
    process.exit(1)
  }

  console.log(`Found organization: ${org.name} (${org.id})`)

  const orgMembers = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, org.id))

  if (orgMembers.length === 0) {
    console.error('Organization has no members')
    process.exit(1)
  }

  const owner = orgMembers.find((m) => m.role === 'owner')
  const ownerId = owner?.userId || orgMembers[0].userId

  console.log(`Using owner ID: ${ownerId}`)

  // Clean up existing demo requests first to avoid duplicates
  console.log('\n--- Cleaning up existing demo requests ---')
  const existingDemoRequests = await db
    .select({
      id: request.id,
      conversationId: request.conversationId,
      cargoDetailsId: request.cargoDetailsId,
    })
    .from(request)
    .where(
      and(
        eq(request.receiverOrganizationId, org.id),
        like(request.requesterEmail, `${DEMO_PREFIX}%`)
      )
    )

  for (const req of existingDemoRequests) {
    if (req.conversationId) {
      await db.delete(message).where(eq(message.conversationId, req.conversationId))
      await db
        .delete(conversationParticipant)
        .where(eq(conversationParticipant.conversationId, req.conversationId))
      await db.delete(conversation).where(eq(conversation.id, req.conversationId))
    }

    await db.delete(request).where(eq(request.id, req.id))

    if (req.cargoDetailsId) {
      const [cargo] = await db
        .select()
        .from(cargoDetails)
        .where(eq(cargoDetails.id, req.cargoDetailsId))
      if (cargo?.dimensionsId) {
        await db.delete(dimensions).where(eq(dimensions.id, cargo.dimensionsId))
      }
      await db.delete(cargoDetails).where(eq(cargoDetails.id, req.cargoDetailsId))
    }
  }
  console.log(`Cleaned up ${existingDemoRequests.length} existing demo requests`)

  // Get available services and categories from DB
  const allServices = await db.select({ id: service.id, name: service.name }).from(service)
  const allCategories = await db.select({ id: category.id, name: category.name }).from(category)

  // First, select a LIMITED pool of 6 services and 6 categories for the organization
  const availableServices = randomElements(allServices, Math.min(6, allServices.length))
  const availableCategories = randomElements(allCategories, Math.min(6, allCategories.length))

  // Pre-select services/categories for each request from the LIMITED pool
  const requestServicesAndCategories: Array<{
    services: typeof availableServices
    categories: typeof availableCategories
  }> = []
  const usedServiceIds = new Set<string>()
  const usedCategoryIds = new Set<string>()

  for (let i = 0; i < DEMO_REQUESTERS.length; i++) {
    const numServices = Math.random() > 0.5 ? 3 : Math.min(6, availableServices.length)
    const numCategories = Math.random() > 0.5 ? 3 : Math.min(6, availableCategories.length)

    // Pick from the LIMITED pool, not all services/categories
    const reqServices = randomElements(availableServices, numServices)
    const reqCategories = randomElements(availableCategories, numCategories)

    reqServices.forEach((s) => usedServiceIds.add(s.id))
    reqCategories.forEach((c) => usedCategoryIds.add(c.id))

    requestServicesAndCategories.push({ services: reqServices, categories: reqCategories })
  }

  // Clear existing and link only the used services and categories to the organization
  console.log('\n--- Resetting and linking only used services/categories to organization ---')

  // Delete ALL existing org services and categories first
  await db.delete(organizationServices).where(eq(organizationServices.organizationId, org.id))
  await db.delete(organizationCategories).where(eq(organizationCategories.organizationId, org.id))

  // Add only the used ones
  for (const serviceId of usedServiceIds) {
    await db.insert(organizationServices).values({
      organizationId: org.id,
      serviceId: serviceId,
      price: Math.floor(100 + Math.random() * 900) * 100,
      currency: 'EUR',
    })
  }

  for (const categoryId of usedCategoryIds) {
    await db.insert(organizationCategories).values({
      organizationId: org.id,
      categoryId: categoryId,
    })
  }

  const usedServicesNames = allServices.filter((s) => usedServiceIds.has(s.id)).map((s) => s.name)
  const usedCategoriesNames = allCategories
    .filter((c) => usedCategoryIds.has(c.id))
    .map((c) => c.name)

  console.log(`Linked ${usedServiceIds.size} services: ${usedServicesNames.join(', ')}`)
  console.log(`Linked ${usedCategoryIds.size} categories: ${usedCategoriesNames.join(', ')}`)

  const createdMemberUserIds: string[] = []
  const createdMemberIds: string[] = []
  const createdAnonymousUserIds: string[] = []
  const createdRequestIds: string[] = []
  const createdConversationIds: string[] = []
  const createdInvitationIds: string[] = []

  console.log('\n--- Creating demo members ---')
  for (const demoMember of DEMO_MEMBERS) {
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, demoMember.email))
      .limit(1)

    let userId: string
    if (existingUser.length > 0) {
      console.log(`User ${demoMember.email} already exists, using existing`)
      userId = existingUser[0].id
    } else {
      userId = generateId()
      await db.insert(user).values({
        id: userId,
        name: demoMember.name,
        email: demoMember.email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      createdMemberUserIds.push(userId)
      console.log(`Created user: ${demoMember.name} (${demoMember.email})`)
    }

    const existingMember = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, org.id)))
      .limit(1)

    if (existingMember.length === 0) {
      const memberId = generateId()
      await db.insert(member).values({
        id: memberId,
        organizationId: org.id,
        userId: userId,
        role: demoMember.role,
        createdAt: new Date(),
      })
      createdMemberIds.push(memberId)
      console.log(`Added ${demoMember.name} as ${demoMember.role}`)
    }

    // Add member to team chat
    try {
      await conversationService.addMemberToTeamChat(org.id, userId)
      console.log(`Added ${demoMember.name} to team chat`)
    } catch (error) {
      // Ignore if already in team chat
      if (error instanceof Error && !error.message.includes('already')) {
        console.warn(`Could not add ${demoMember.name} to team chat:`, error)
      }
    }
  }

  console.log('\n--- Creating demo invitations ---')
  for (const inv of DEMO_INVITATIONS) {
    const existingInv = await db
      .select()
      .from(invitation)
      .where(and(eq(invitation.email, inv.email), eq(invitation.organizationId, org.id)))
      .limit(1)

    if (existingInv.length === 0) {
      const invId = generateId()
      await db.insert(invitation).values({
        id: invId,
        organizationId: org.id,
        email: inv.email,
        role: inv.role,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        inviterId: ownerId,
      })
      createdInvitationIds.push(invId)
      console.log(`Created invitation for: ${inv.email}`)
    }
  }

  console.log('\n--- Creating demo requesters ---')
  const requesterData: Array<{ id: string; isGuest: boolean }> = []
  for (const requester of DEMO_REQUESTERS) {
    if (requester.isGuest) {
      const existingAnon = await db
        .select()
        .from(anonymousUser)
        .where(eq(anonymousUser.email, requester.email))
        .limit(1)

      let anonId: string
      if (existingAnon.length > 0) {
        console.log(`Guest user ${requester.email} already exists, using existing`)
        anonId = existingAnon[0].id
      } else {
        anonId = generateId()
        await db.insert(anonymousUser).values({
          id: anonId,
          email: requester.email,
          name: requester.name,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        })
        createdAnonymousUserIds.push(anonId)
        console.log(`Created guest user: ${requester.name} (${requester.email})`)
      }
      requesterData.push({ id: anonId, isGuest: true })
    } else {
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, requester.email))
        .limit(1)

      let oderId: string
      if (existingUser.length > 0) {
        console.log(`User ${requester.email} already exists, using existing`)
        oderId = existingUser[0].id
      } else {
        oderId = generateId()
        await db.insert(user).values({
          id: oderId,
          name: requester.name,
          email: requester.email,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        console.log(`Created registered user: ${requester.name} (${requester.email})`)
      }
      requesterData.push({ id: oderId, isGuest: false })
    }
  }

  console.log('\n--- Creating demo requests (with auto-generated conversations) ---')
  const now = new Date()

  for (let i = 0; i < DEMO_REQUESTERS.length; i++) {
    const requester = DEMO_REQUESTERS[i]
    const { id: requesterId, isGuest } = requesterData[i]

    const fromDate = randomDate(
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    )
    const toDate = new Date(
      fromDate.getTime() + Math.floor(1 + Math.random() * 14) * 24 * 60 * 60 * 1000
    )

    const newRequest = await requestsApplicationService.createRequest({
      requesterEmail: requester.email,
      requesterName: requester.name,
      requesterPhone: `+32 ${Math.floor(400 + Math.random() * 100)} ${Math.floor(100000 + Math.random() * 899999)}`,
      requesterId: isGuest ? undefined : requesterId,
      receiverOrganizationId: org.id,
      categories: requestServicesAndCategories[i].categories.map((c) => c.id),
      services: requestServicesAndCategories[i].services.map((s) => s.id),
      cargoDetails: {
        weight: Math.floor(500 + Math.random() * 9500),
        volume: Math.floor(10 + Math.random() * 90),
        palletCount: Math.floor(5 + Math.random() * 45),
        fragility: Math.random() > 0.7 ? 'fragile' : 'robust',
        dimensions: {
          length: Math.floor(100 + Math.random() * 400),
          width: Math.floor(80 + Math.random() * 160),
          height: Math.floor(50 + Math.random() * 150),
        },
      },
      comments: `Demo request from ${requester.name}`,
      fromDate: fromDate,
      toDate: toDate,
    })

    createdRequestIds.push(newRequest.id)
    if (newRequest.conversationId) {
      createdConversationIds.push(newRequest.conversationId)
    }

    console.log(
      `Created request: ${newRequest.reqNumber} - ${requester.name}${isGuest ? ' (Guest)' : ''}`
    )
  }

  const registeredRequesters = requesterData.filter((r) => !r.isGuest).length
  const guestRequesters = requesterData.filter((r) => r.isGuest).length

  console.log('\n=== Demo Data Summary ===')
  console.log(`Organization: ${org.name} (${slug})`)
  console.log(`Created org members: ${createdMemberIds.length}`)
  console.log(`Created invitations: ${createdInvitationIds.length}`)
  console.log(
    `Created requesters: ${requesterData.length} (${registeredRequesters} registered, ${guestRequesters} guest)`
  )
  console.log(`Created requests: ${createdRequestIds.length}`)
  console.log(`Created conversations: ${createdConversationIds.length}`)
  console.log('=========================\n')
}

async function unloadDemoData(slug: string) {
  console.log(`Unloading demo data for organization with slug: ${slug}`)

  const [org] = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1)

  if (!org) {
    console.error(`Organization with slug "${slug}" not found`)
    process.exit(1)
  }

  console.log(`Found organization: ${org.name} (${org.id})`)

  console.log('\n--- Deleting demo requests ---')
  const demoRequests = await db
    .select({
      id: request.id,
      conversationId: request.conversationId,
      cargoDetailsId: request.cargoDetailsId,
    })
    .from(request)
    .where(
      and(
        eq(request.receiverOrganizationId, org.id),
        like(request.requesterEmail, `${DEMO_PREFIX}%`)
      )
    )

  for (const req of demoRequests) {
    if (req.conversationId) {
      await db.delete(message).where(eq(message.conversationId, req.conversationId))
      await db
        .delete(conversationParticipant)
        .where(eq(conversationParticipant.conversationId, req.conversationId))
      await db.delete(conversation).where(eq(conversation.id, req.conversationId))
    }

    await db.delete(request).where(eq(request.id, req.id))

    if (req.cargoDetailsId) {
      const [cargo] = await db
        .select()
        .from(cargoDetails)
        .where(eq(cargoDetails.id, req.cargoDetailsId))
      if (cargo?.dimensionsId) {
        await db.delete(dimensions).where(eq(dimensions.id, cargo.dimensionsId))
      }
      await db.delete(cargoDetails).where(eq(cargoDetails.id, req.cargoDetailsId))
    }
  }
  console.log(`Deleted ${demoRequests.length} demo requests`)

  console.log('\n--- Deleting demo invitations ---')
  const deletedInvitations = await db
    .delete(invitation)
    .where(and(eq(invitation.organizationId, org.id), like(invitation.email, `${DEMO_PREFIX}%`)))
    .returning()
  console.log(`Deleted ${deletedInvitations.length} demo invitations`)

  console.log('\n--- Deleting demo anonymous users ---')
  const deletedAnonymous = await db
    .delete(anonymousUser)
    .where(like(anonymousUser.email, `${DEMO_PREFIX}%`))
    .returning()
  console.log(`Deleted ${deletedAnonymous.length} demo anonymous users`)

  console.log('\n--- Deleting demo members and users ---')
  const demoUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.email, `${DEMO_PREFIX}%`))

  if (demoUsers.length > 0) {
    const demoUserIds = demoUsers.map((u) => u.id)

    const deletedMembers = await db
      .delete(member)
      .where(inArray(member.userId, demoUserIds))
      .returning()
    console.log(`Deleted ${deletedMembers.length} demo members`)

    const deletedUsers = await db.delete(user).where(inArray(user.id, demoUserIds)).returning()
    console.log(`Deleted ${deletedUsers.length} demo users`)
  }

  console.log('\n=== Unload Complete ===')
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const slug = args[1]

  if (!command || !slug) {
    console.log('Usage:')
    console.log('  npx tsx src/scripts/seed-demo-data.ts load <slug>')
    console.log('  npx tsx src/scripts/seed-demo-data.ts unload <slug>')
    console.log('')
    console.log('Example:')
    console.log('  npx tsx src/scripts/seed-demo-data.ts load my-company')
    console.log('  npx tsx src/scripts/seed-demo-data.ts unload my-company')
    process.exit(1)
  }

  try {
    if (command === 'load') {
      await loadDemoData(slug)
    } else if (command === 'unload') {
      await unloadDemoData(slug)
    } else {
      console.error(`Unknown command: ${command}`)
      console.log('Valid commands: load, unload')
      process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  process.exit(0)
}

main()
