import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { nanoid } from 'nanoid'
import { env } from '../infrastructure/config/environment'
import { category } from '../infrastructure/database/db/schemas/category-schema'

const db = drizzle(env.DATABASE_URL!)

interface CategoryData {
  _id: { $oid: string }
  id: string
  order: number
  lang: {
    en: string
  }
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function seedCategories() {
  try {
    console.log('Starting categories seeding...')

    const jsonPath = join(__dirname, 'data/ortelius-development.categories.json')
    const jsonData = readFileSync(jsonPath, 'utf-8')
    const categoriesData: CategoryData[] = JSON.parse(jsonData)

    console.log(`${categoriesData.length} categories found in JSON file`)

    const categoriesToInsert = categoriesData.map((cat) => ({
      id: nanoid(),
      name: cat.lang.en,
      slug: createSlug(cat.lang.en),
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    console.log('Inserting categories into database...')

    await db.transaction(async (tx) => {
      await tx.delete(category)
      console.log('Existing categories deleted')

      await tx.insert(category).values(categoriesToInsert)
      console.log(`${categoriesToInsert.length} categories inserted successfully`)
    })

    console.log('Seeding completed successfully!')
  } catch (error) {
    console.error('Error during seeding:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  seedCategories()
    .then(() => {
      console.log('Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { seedCategories }
