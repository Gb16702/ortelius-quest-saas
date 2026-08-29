import { createHmac } from 'node:crypto'
import { env } from '../config/environment'

export interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

export interface IceServersResult {
  iceServers: IceServer[]
  ttl: number
}

const FALLBACK_STUN: IceServer = { urls: 'stun:stun.l.google.com:19302' }

/**
 * Verifies TURN is configured. Call once at startup to surface NAT-traversal
 * misconfigurations early — without TURN, peers behind symmetric NAT will fail
 * to establish a media path and audio will be silent despite a "connected"
 * connection state.
 */
export function assertTurnConfig(): void {
  const hasTurn = Boolean(env.TURN_SERVER_URL && env.TURN_SECRET)
  if (hasTurn) {
    console.info('[VoIP] TURN server configured:', env.TURN_SERVER_URL)
    return
  }
  const isProd = env.NODE_ENV === 'production'
  const message =
    '[VoIP] TURN_SERVER_URL or TURN_SECRET missing — peers behind symmetric NAT will fail. Set both env vars to enable TURN relay.'
  if (isProd) {
    console.error(message)
  } else {
    console.warn(message)
  }
}

export function buildIceServers(userId: string): IceServersResult {
  const ttl = env.TURN_CREDENTIAL_TTL
  const turnUrl = env.TURN_SERVER_URL
  const turnSecret = env.TURN_SECRET

  if (!turnUrl || !turnSecret) {
    return { iceServers: [FALLBACK_STUN], ttl }
  }

  const expiry = Math.floor(Date.now() / 1000) + ttl
  const username = `${expiry}:${userId}`
  const credential = createHmac('sha1', turnSecret).update(username).digest('base64')

  const stunUrl = turnUrl.replace(/^turn:/, 'stun:')
  const turnsUrl = turnUrl.replace(':3478', ':5349').replace(/^turn:/, 'turns:')

  return {
    iceServers: [
      { urls: stunUrl },
      {
        urls: turnsUrl !== turnUrl ? [turnUrl, turnsUrl] : [turnUrl],
        username,
        credential,
      },
    ],
    ttl,
  }
}
