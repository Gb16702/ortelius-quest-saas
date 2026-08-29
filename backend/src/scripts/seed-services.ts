import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { nanoid } from 'nanoid'
import { env } from '../infrastructure/config/environment'
import { service } from '../infrastructure/database/db/schemas/services-schema'

const db = drizzle(env.DATABASE_URL!)

interface ServiceData {
  _id: { $oid: string }
  id: string
  order: number
  lang: {
    en: string
    nl?: string
  }
  type: 'port' | 'cargo' | 'storage' | 'logistics'
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function seedServices() {
  try {
    console.log('Starting services seeding...')

    const jsonPath = join(__dirname, 'data/ortelius-development.services.json')
    const jsonData = readFileSync(jsonPath, 'utf-8')
    const servicesData: ServiceData[] = JSON.parse(jsonData)

    console.log(`${servicesData.length} services found in JSON file`)

    const servicesToInsert = servicesData.map((srv) => ({
      id: nanoid(),
      name: srv.lang.en,
      slug: createSlug(srv.lang.en),
      type: srv.type,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    console.log('Inserting services into database...')

    await db.transaction(async (tx) => {
      await tx.delete(service)
      console.log('Existing services deleted')

      await tx.insert(service).values(servicesToInsert)
      console.log(`${servicesToInsert.length} services inserted successfully`)
    })

    console.log('Seeding completed successfully!')
  } catch (error) {
    console.error('Error during seeding:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  seedServices()
    .then(() => {
      console.log('Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { seedServices }
