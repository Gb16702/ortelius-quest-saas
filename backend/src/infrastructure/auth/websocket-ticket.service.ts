import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const TICKET_PREFIX = 'ws-ticket'
const DEFAULT_TTL_SECONDS = 60

type TicketPayload = {
  sub: string
  exp: number
  nonce: string
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(normalized + padding, 'base64').toString('utf8')
}

function getTicketSecret(): string {
  const secret = process.env.ENCRYPTION_KEY || process.env.ADMIN_SERVICE_TOKEN
  if (!secret) {
    throw new Error('WebSocket ticket secret is not configured')
  }
  return secret
}

function signPayload(encodedPayload: string): string {
  return createHmac('sha256', getTicketSecret()).update(encodedPayload).digest('base64url')
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  )
}

export function createWebSocketTicket(
  userId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS
): { token: string; expiresIn: number; expiresAt: string } {
  const expiresAt = Date.now() + ttlSeconds * 1000
  const encodedPayload = base64UrlEncode(
    JSON.stringify({
      sub: userId,
      exp: expiresAt,
      nonce: randomUUID(),
    } satisfies TicketPayload)
  )
  const signature = signPayload(encodedPayload)

  return {
    token: `${TICKET_PREFIX}.${encodedPayload}.${signature}`,
    expiresIn: ttlSeconds,
    expiresAt: new Date(expiresAt).toISOString(),
  }
}

export function verifyWebSocketTicket(token: string): string | null {
  const [prefix, encodedPayload, signature] = token.split('.')
  if (prefix !== TICKET_PREFIX || !encodedPayload || !signature) return null

  const expectedSignature = signPayload(encodedPayload)
  if (!signaturesMatch(signature, expectedSignature)) return null

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<TicketPayload>
    if (!payload.sub || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null
    return payload.sub
  } catch {
    return null
  }
}
