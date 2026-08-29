import { eq } from 'drizzle-orm'
import { db } from '../infrastructure/database'
import { user } from '../infrastructure/database/db/schemas/auth-schema'

const TEST_USER_CREDENTIALS = {
  email: 'e2e-test@playwright-testing.com',
  name: 'Test User',
}

async function seedTestUser() {
  try {
    console.log('Starting test user seeding...')

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, TEST_USER_CREDENTIALS.email))
      .limit(1)

    if (existingUser.length > 0) {
      console.log(
        `Test user with email ${TEST_USER_CREDENTIALS.email} already exists, skipping creation`
      )
      return existingUser[0]
    }

    const newId = crypto.randomUUID()
    const [created] = await db
      .insert(user)
      .values({
        id: newId,
        email: TEST_USER_CREDENTIALS.email,
        name: TEST_USER_CREDENTIALS.name,
        emailVerified: true,
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    console.log(`Test user created successfully with email: ${TEST_USER_CREDENTIALS.email}`)
    return created
  } catch (error) {
    console.error('Error during test user seeding:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  seedTestUser()
    .then(() => {
      console.log('Test user seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { seedTestUser }
