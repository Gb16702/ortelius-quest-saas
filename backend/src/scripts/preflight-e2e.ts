const DEFAULT_E2E_API_URL = 'http://localhost:4100'
const E2E_API_URL = (process.env.E2E_API_URL ?? DEFAULT_E2E_API_URL).replace(/\/+$/, '')

const E2E_ORG_ID = 'e2e-test-org'
const E2E_ORG_SLUG = 'e2e-test-org'
const E2E_SHARED_CONVERSATION_ID = '44444444-4444-4444-8444-444444444444'

const E2E_ACCOUNTS = [
  {
    role: 'admin',
    userId: 'e2e-admin-user-id',
    email: 'e2e-admin@test.local',
    organizationRole: 'admin',
  },
  {
    role: 'member',
    userId: 'e2e-member-user-id',
    email: 'e2e-member@test.local',
    organizationRole: 'member',
  },
  {
    role: 'guest',
    userId: 'e2e-guest-user-id',
    email: 'e2e-guest@test.local',
    organizationRole: null,
  },
] as const

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown, label: string): JsonRecord {
  if (isRecord(value)) return value
  throw new Error(`${label} was not an object`)
}

function asArray(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value
  throw new Error(`${label} was not an array`)
}

function expectField<T extends string | boolean | null>(
  record: JsonRecord,
  field: string,
  expected: T,
  label: string
) {
  if (record[field] !== expected) {
    throw new Error(
      `${label} expected ${field}=${String(expected)}, received ${String(record[field])}`
    )
  }
}

function authHeaders(userId: string): HeadersInit {
  return { Authorization: `Bearer test-bypass:${userId}` }
}

async function fetchJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${E2E_API_URL}${path}`, init)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${text}`)
  }

  return text ? JSON.parse(text) : null
}

async function expectHealth() {
  const payload = asRecord(await fetchJson('/api/health'), 'health response')
  expectField(payload, 'status', 'ok', 'health response')
}

async function expectProfilesAndRoles() {
  for (const account of E2E_ACCOUNTS) {
    const profile = asRecord(
      await fetchJson('/api/auth/profile', { headers: authHeaders(account.userId) }),
      `${account.role} profile`
    )
    expectField(profile, 'id', account.userId, `${account.role} profile`)
    expectField(profile, 'email', account.email, `${account.role} profile`)

    const rolePayload = asRecord(
      await fetchJson(`/api/organizations/${E2E_ORG_ID}/user/role`, {
        headers: authHeaders(account.userId),
      }),
      `${account.role} organization role response`
    )
    const data = asRecord(rolePayload.data, `${account.role} organization role data`)
    expectField(data, 'role', account.organizationRole, `${account.role} organization role`)
  }
}

async function expectOrganization() {
  const payload = asRecord(
    await fetchJson(`/api/organizations/by-slug/${E2E_ORG_SLUG}`),
    'organization response'
  )
  const data = asRecord(payload.data, 'organization data')
  expectField(data, 'id', E2E_ORG_ID, 'organization data')
  expectField(data, 'slug', E2E_ORG_SLUG, 'organization data')
}

async function expectCatalogFixtures() {
  const categoriesPayload = asRecord(
    await fetchJson(`/api/categories/organizations/${E2E_ORG_ID}`, {
      headers: authHeaders(E2E_ACCOUNTS[0].userId),
    }),
    'categories response'
  )
  const categories = asArray(categoriesPayload.data, 'categories data')
  if (!categories.some((item) => isRecord(item) && item.id === 'e2e-cargo-category')) {
    throw new Error('Missing e2e-cargo-category fixture')
  }

  const servicesPayload = asRecord(
    await fetchJson(`/api/services/organizations/${E2E_ORG_ID}`, {
      headers: authHeaders(E2E_ACCOUNTS[0].userId),
    }),
    'services response'
  )
  const services = asArray(servicesPayload.data, 'services data')
  if (!services.some((item) => isRecord(item) && item.id === 'e2e-freight-service')) {
    throw new Error('Missing e2e-freight-service fixture')
  }
}

async function expectChatFixture() {
  const payload = asRecord(
    await fetchJson('/api/conversations?limit=50&offset=0', {
      headers: authHeaders(E2E_ACCOUNTS[0].userId),
    }),
    'conversations response'
  )
  const data = asRecord(payload.data, 'conversations data')
  const conversations = asArray(data.conversations, 'conversations list')

  if (!conversations.some((item) => isRecord(item) && item.id === E2E_SHARED_CONVERSATION_ID)) {
    throw new Error(`Missing shared conversation ${E2E_SHARED_CONVERSATION_ID}`)
  }
}

async function expectSubscriptionFixture() {
  const payload = asRecord(
    await fetchJson('/api/subscription/current', {
      headers: authHeaders(E2E_ACCOUNTS[0].userId),
    }),
    'subscription current response'
  )
  expectField(payload, 'plan', 'professional', 'subscription current response')
  expectField(payload, 'status', 'active', 'subscription current response')
  expectField(payload, 'hasActiveSubscription', true, 'subscription current response')
}

async function main() {
  await expectHealth()
  await expectProfilesAndRoles()
  await expectOrganization()
  await expectCatalogFixtures()
  await expectChatFixture()
  await expectSubscriptionFixture()

  console.log(`E2E preflight passed for ${E2E_API_URL}`)
}

main().catch((error) => {
  console.error('E2E preflight failed:', error)
  process.exit(1)
})
