import type { Context } from 'hono'

type TestAuthBypassEnv = {
  NODE_ENV?: string
  ENABLE_TEST_AUTH_BYPASS?: string
}

const TEST_BYPASS_PREFIX = 'test-bypass:'
const TEST_BYPASS_ALLOWED_ENVS = new Set(['development', 'test'])

export const readQueryCredential = (c: Context): string | null =>
  c.req.query('token') ?? c.req.query('ticket') ?? null

export const readBearerOrQueryCredential = (c: Context): string | null => {
  const authHeader = c.req.header('Authorization')
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : readQueryCredential(c)
}

const readPrefixedTestUserId = (credential: string | null | undefined): string | null =>
  credential?.startsWith(TEST_BYPASS_PREFIX) ? credential.slice(TEST_BYPASS_PREFIX.length) : null

export const isTestAuthBypassEnabled = (env: TestAuthBypassEnv = process.env): boolean =>
  env.ENABLE_TEST_AUTH_BYPASS === 'true' && TEST_BYPASS_ALLOWED_ENVS.has(env.NODE_ENV ?? '')

export const readTestAuthBypassUserId = (c: Context): string | null => {
  const authHeader = c.req.header('Authorization')

  return (
    c.req.header('X-Test-User-Id') ||
    c.req.query('__test_user_id') ||
    readPrefixedTestUserId(
      authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    ) ||
    readPrefixedTestUserId(readQueryCredential(c))
  )
}
