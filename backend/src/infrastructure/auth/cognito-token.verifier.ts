import { createRemoteJWKSet, jwtVerify } from 'jose'

export interface TokenPayload {
  sub: string
  email?: string
  groups: string[]
}

export class CognitoTokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>
  private readonly issuer: string
  private readonly clientId: string

  constructor(config: { userPoolId: string; region: string; clientId: string }) {
    this.issuer = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`
    this.clientId = config.clientId
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`))
  }

  async verify(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
      })

      if (payload.token_use !== 'access') return null
      if (payload.client_id !== this.clientId) return null
      if (typeof payload.sub !== 'string') return null

      const email =
        typeof payload.email === 'string'
          ? payload.email
          : typeof payload.username === 'string' && payload.username.includes('@')
            ? payload.username
            : undefined

      return {
        sub: payload.sub,
        email,
        groups: Array.isArray(payload['cognito:groups'])
          ? (payload['cognito:groups'] as string[])
          : [],
      }
    } catch {
      return null
    }
  }
}
