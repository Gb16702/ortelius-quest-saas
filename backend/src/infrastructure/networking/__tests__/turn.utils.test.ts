import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'

// Holder object mutated in beforeEach. Live mutation works because
// `import { env }` is a live binding and `env` is the *same* holder reference.
const env: {
  [key: string]: unknown
  ENCRYPTION_KEY: string
  OPENAI_API_KEY: string
  POSTMARK_API_KEY: string
  STRIPE_SECRET_KEY: string
  TURN_SERVER_URL?: string
  TURN_SECRET?: string
  TURN_CREDENTIAL_TTL: number
  NODE_ENV: 'production' | 'development' | 'test'
} = {
  NODE_ENV: 'test',
  PORT: 3000,
  HOST: 'localhost',
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'test',
  DB_USER: 'test',
  DB_PASSWORD: 'test',
  DB_MAX_CONNECTIONS: 10,
  DB_TIMEOUT: 30000,
  COGNITO_USERPOOL_ID: 'test-pool',
  COGNITO_CLIENT_ID: 'test-client',
  COGNITO_REGION: 'eu-west-3',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  FRONTEND_URL: 'https://app.example.com',
  AUTH_PORTAL_URL: 'https://auth.example.com',
  STRIPE_SECRET_KEY: 'sk_test_mock',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
  STRIPE_WEBHOOK_SECRET: 'whsec_mock',
  STRIPE_PRICE_STARTER_MONTHLY: 'price_starter_monthly',
  STRIPE_PRICE_STARTER_ANNUAL: 'price_starter_annual',
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: 'price_professional_monthly',
  STRIPE_PRICE_PROFESSIONAL_ANNUAL: 'price_professional_annual',
  STRIPE_PRICE_ENTERPRISE_MONTHLY: 'price_enterprise_monthly',
  STRIPE_PRICE_ENTERPRISE_ANNUAL: 'price_enterprise_annual',
  POSTMARK_API_KEY: 'postmark_mock',
  AWS_REGION: 'eu-west-3',
  AWS_S3_ACCESS_KEY_ID: 'aws-key',
  AWS_S3_SECRET_ACCESS_KEY: 'aws-secret',
  AWS_S3_BUCKET_NAME: 'test-bucket',
  OPENAI_API_KEY: 'openai_mock',
  CORS_ORIGINS: ['http://localhost:5173'],
  TURN_SERVER_URL: undefined,
  TURN_SECRET: undefined,
  TURN_CREDENTIAL_TTL: 3600,
  ENABLE_SWAGGER: true,
  ENABLE_METRICS: false,
  ENABLE_RATE_LIMIT: false,
  LOG_LEVEL: 'error',
  LOG_FORMAT: 'json',
}

mock.module('../../config/environment', () => ({ env }))

import { createHmac } from 'node:crypto'
import { assertTurnConfig, buildIceServers } from '../turn.utils'

beforeEach(() => {
  env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'
  env.TURN_SERVER_URL = undefined
  env.TURN_SECRET = undefined
  env.TURN_CREDENTIAL_TTL = 3600
  env.NODE_ENV = 'test'
})

describe('buildIceServers', () => {
  it('returns STUN fallback when TURN_SERVER_URL is missing', () => {
    env.TURN_SECRET = 'secret'
    const result = buildIceServers('user-1')
    expect(result.iceServers).toEqual([{ urls: 'stun:stun.l.google.com:19302' }])
    expect(result.ttl).toBe(3600)
  })

  it('returns STUN fallback when TURN_SECRET is missing', () => {
    env.TURN_SERVER_URL = 'turn:turn.example.com:3478'
    const result = buildIceServers('user-1')
    expect(result.iceServers).toEqual([{ urls: 'stun:stun.l.google.com:19302' }])
  })

  it('returns STUN fallback when both env vars are missing', () => {
    const result = buildIceServers('user-1')
    expect(result.iceServers).toHaveLength(1)
    expect(result.iceServers[0].urls).toContain('stun:')
  })

  it('builds username with format expiry:userId', () => {
    env.TURN_SERVER_URL = 'turn:turn.example.com:3478'
    env.TURN_SECRET = 'super-secret'
    const before = Math.floor(Date.now() / 1000) + 3600
    const result = buildIceServers('user-42')
    const after = Math.floor(Date.now() / 1000) + 3600

    const turnEntry = result.iceServers[1]
    expect(turnEntry.username).toBeDefined()
    const [expiryStr, userId] = turnEntry.username!.split(':')
    expect(userId).toBe('user-42')
    const expiry = Number(expiryStr)
    expect(expiry).toBeGreaterThanOrEqual(before)
    expect(expiry).toBeLessThanOrEqual(after)
  })

  it('credential is HMAC-SHA1(secret, username) base64-encoded', () => {
    env.TURN_SERVER_URL = 'turn:turn.example.com:3478'
    env.TURN_SECRET = 'super-secret'
    const result = buildIceServers('user-42')
    const turnEntry = result.iceServers[1]
    const expectedCred = createHmac('sha1', 'super-secret')
      .update(turnEntry.username!)
      .digest('base64')
    expect(turnEntry.credential).toBe(expectedCred)
  })

  it('adds turns:// TLS variant when port :3478 is in URL', () => {
    env.TURN_SERVER_URL = 'turn:turn.example.com:3478'
    env.TURN_SECRET = 'secret'
    const result = buildIceServers('user-1')
    const turnEntry = result.iceServers[1]
    expect(turnEntry.urls).toEqual(['turn:turn.example.com:3478', 'turns:turn.example.com:5349'])
  })

  it('still adds turns:// variant via protocol swap when port is non-standard', () => {
    // Even without port replacement, the protocol substitution alone produces
    // a different URL (turn: → turns:), so the TLS variant is appended.
    env.TURN_SERVER_URL = 'turn:turn.example.com:5000'
    env.TURN_SECRET = 'secret'
    const result = buildIceServers('user-1')
    const turnEntry = result.iceServers[1]
    expect(turnEntry.urls).toEqual(['turn:turn.example.com:5000', 'turns:turn.example.com:5000'])
  })

  it('includes a STUN entry alongside TURN', () => {
    env.TURN_SERVER_URL = 'turn:turn.example.com:3478'
    env.TURN_SECRET = 'secret'
    const result = buildIceServers('user-1')
    expect(result.iceServers[0].urls).toBe('stun:turn.example.com:3478')
  })

  it('respects custom TTL', () => {
    env.TURN_CREDENTIAL_TTL = 7200
    env.TURN_SERVER_URL = 'turn:turn.example.com:3478'
    env.TURN_SECRET = 'secret'
    const result = buildIceServers('user-1')
    expect(result.ttl).toBe(7200)
  })
})

describe('assertTurnConfig', () => {
  it('logs info when both env vars are configured', () => {
    env.TURN_SERVER_URL = 'turn:turn.example.com:3478'
    env.TURN_SECRET = 'secret'
    const infoSpy = spyOn(console, 'info').mockImplementation(() => {})
    assertTurnConfig()
    expect(infoSpy).toHaveBeenCalledWith(
      '[VoIP] TURN server configured:',
      'turn:turn.example.com:3478'
    )
    infoSpy.mockRestore()
  })

  it('logs error in production when TURN is missing', () => {
    env.NODE_ENV = 'production'
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    assertTurnConfig()
    expect(errorSpy).toHaveBeenCalled()
    expect(errorSpy.mock.calls[0][0]).toContain('TURN_SERVER_URL or TURN_SECRET missing')
    errorSpy.mockRestore()
  })

  it('logs warn in non-production when TURN is missing', () => {
    env.NODE_ENV = 'development'
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    assertTurnConfig()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('does not log error in development when TURN is missing', () => {
    env.NODE_ENV = 'development'
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    assertTurnConfig()
    expect(errorSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })
})
