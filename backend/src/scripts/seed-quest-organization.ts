import { eq } from 'drizzle-orm'
import { db } from '../infrastructure/database'
import { member, organization, user } from '../infrastructure/database/db/schemas/auth-schema'

const ORGANIZATION_DATA = {
  name: 'Quest',
  slug: 'quest',
  logo: 'https://ortelius-a484724.s3.eu-west-3.amazonaws.com/organization-logos/c2e5441feffad9bfdee28e00b39829ff.png',
  tagline: 'Expert logistics solutions for businesses. We move your cargo safely and on time.',
  overview:
    'Quest is a full-service logistics company specializing in freight forwarding, customs brokerage, and supply chain management. With over a decade of experience, we provide reliable cargo transportation across land, sea, and air. Our team of certified professionals ensures your shipments are handled with care, delivered on time, and fully compliant with international trade regulations.',
  status: 'active',
}

const TEST_USER_DATA = {
  name: 'test test',
  email: 'test-ortelius@test.com',
}

function generateId(): string {
  return crypto.randomUUID()
}

async function seedQuestOrganization() {
  console.log('Starting Quest organization seeding')

  try {
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, TEST_USER_DATA.email))
      .limit(1)

    let createdUser: { id: string; email: string; name: string }

    if (existingUser.length > 0) {
      console.log(`User with email ${TEST_USER_DATA.email} already exists`)
      createdUser = existingUser[0]
    } else {
      console.log('Creating test user')
      const userId = generateId()
      const [newUser] = await db
        .insert(user)
        .values({
          id: userId,
          email: TEST_USER_DATA.email,
          name: TEST_USER_DATA.name,
          emailVerified: true,
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      createdUser = newUser
      console.log(`User created successfully: ${createdUser.email}`)
    }

    // 2. Check if organization already exists
    const existingOrg = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, ORGANIZATION_DATA.slug))
      .limit(1)

    let createdOrg: { id: string; name: string; slug: string | null }

    if (existingOrg.length > 0) {
      console.log(
        `Organization with slug ${ORGANIZATION_DATA.slug} already exists, using existing organization`
      )
      createdOrg = existingOrg[0]
    } else {
      console.log('Creating Quest organization...')
      const orgId = generateId()
      const now = new Date()

      const [newOrg] = await db
        .insert(organization)
        .values({
          id: orgId,
          name: ORGANIZATION_DATA.name,
          slug: ORGANIZATION_DATA.slug,
          logo: ORGANIZATION_DATA.logo,
          tagline: ORGANIZATION_DATA.tagline,
          overview: ORGANIZATION_DATA.overview,
          status: ORGANIZATION_DATA.status,
          createdAt: now,
        })
        .returning()

      createdOrg = newOrg
      console.log(`Organization created successfully: ${createdOrg.name} (${createdOrg.slug})`)
    }

    const existingMember = await db
      .select()
      .from(member)
      .where(eq(member.userId, createdUser.id))
      .limit(1)

    if (existingMember.length > 0 && existingMember[0].organizationId === createdOrg.id) {
      console.log('Member relationship already exists, skipping creation')
    } else {
      console.log('Creating member relationship with owner role')
      const memberId = generateId()
      const now = new Date()

      await db.insert(member).values({
        id: memberId,
        organizationId: createdOrg.id,
        userId: createdUser.id,
        role: 'owner',
        createdAt: now,
      })

      console.log(
        `Member relationship created: ${createdUser.email} as owner of ${createdOrg.name}`
      )
    }

    console.log('\n=== Seed Summary ===')
    console.log(`Organization: ${createdOrg.name} (slug: ${createdOrg.slug})`)
    console.log(`User: ${createdUser.name} (${createdUser.email})`)
    console.log('Role: owner')
    console.log('====================\n')

    return {
      organization: createdOrg,
      user: createdUser,
    }
  } catch (error) {
    console.error('Error during Quest organization seeding:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  seedQuestOrganization()
    .then(() => {
      console.log('Quest organization seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { seedQuestOrganization }
