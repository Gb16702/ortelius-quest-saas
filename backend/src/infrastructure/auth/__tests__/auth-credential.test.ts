import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import {
  isTestAuthBypassEnabled,
  readBearerOrQueryCredential,
  readQueryCredential,
  readTestAuthBypassUserId,
} from '../auth-credential'

const readFromUrl = async (url: string, headers?: HeadersInit) => {
  const app = new Hono()
  app.get('/probe', (c) =>
    c.json({
      query: readQueryCredential(c),
      credential: readBearerOrQueryCredential(c),
      bypassUserId: readTestAuthBypassUserId(c),
    })
  )

  const res = await app.request(url, { headers })
  return res.json() as Promise<{
    query: string | null
    credential: string | null
    bypassUserId: string | null
  }>
}

describe('auth credential reader', () => {
  it('accepts WebSocket credentials in the ticket query parameter', async () => {
    const body = await readFromUrl('/probe?ticket=ws-ticket.payload.signature')

    expect(body.query).toBe('ws-ticket.payload.signature')
    expect(body.credential).toBe('ws-ticket.payload.signature')
  })

  it('keeps token query parameter precedence over ticket', async () => {
    const body = await readFromUrl('/probe?token=jwt-token&ticket=ws-ticket.payload.signature')

    expect(body.query).toBe('jwt-token')
    expect(body.credential).toBe('jwt-token')
  })

  it('keeps bearer authorization precedence over query credentials', async () => {
    const body = await readFromUrl('/probe?ticket=ws-ticket.payload.signature', {
      Authorization: 'Bearer jwt-token',
    })

    expect(body.query).toBe('ws-ticket.payload.signature')
    expect(body.credential).toBe('jwt-token')
  })

  it('requires an explicit flag and a non-production environment for test auth bypass', () => {
    expect(
      isTestAuthBypassEnabled({
        NODE_ENV: 'development',
        ENABLE_TEST_AUTH_BYPASS: 'true',
      })
    ).toBe(true)
    expect(
      isTestAuthBypassEnabled({
        NODE_ENV: 'test',
        ENABLE_TEST_AUTH_BYPASS: 'true',
      })
    ).toBe(true)
    expect(
      isTestAuthBypassEnabled({
        NODE_ENV: 'production',
        ENABLE_TEST_AUTH_BYPASS: 'true',
      })
    ).toBe(false)
    expect(
      isTestAuthBypassEnabled({
        NODE_ENV: 'development',
        ENABLE_TEST_AUTH_BYPASS: 'false',
      })
    ).toBe(false)
  })

  it('extracts test bypass user ids from supported E2E credentials', async () => {
    expect((await readFromUrl('/probe?ticket=test-bypass:user-from-ticket')).bypassUserId).toBe(
      'user-from-ticket'
    )
    expect((await readFromUrl('/probe?token=test-bypass:user-from-token')).bypassUserId).toBe(
      'user-from-token'
    )
    expect(
      (
        await readFromUrl('/probe', {
          Authorization: 'Bearer test-bypass:user-from-auth',
        })
      ).bypassUserId
    ).toBe('user-from-auth')
    expect(
      (
        await readFromUrl('/probe', {
          'X-Test-User-Id': 'user-from-header',
        })
      ).bypassUserId
    ).toBe('user-from-header')
  })

  it('does not treat signed WebSocket tickets as test bypass credentials', async () => {
    const body = await readFromUrl('/probe?ticket=ws-ticket.payload.signature')

    expect(body.bypassUserId).toBeNull()
  })
})
