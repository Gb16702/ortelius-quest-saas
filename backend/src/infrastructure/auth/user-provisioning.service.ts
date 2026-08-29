import { eq } from 'drizzle-orm'
import { db } from '../database'
import { user } from '../database/db/schemas/auth-schema'
import type { TokenPayload } from './cognito-token.verifier'

export type AuthUser = {
  id: string
  email: string
  name: string
  image: string | null
  role: string
}

type CognitoAttribute = { Name: string; Value: string }

function toAuthUser(row: typeof user.$inferSelect): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name || '',
    image: row.image,
    role: row.role || 'member',
  }
}

async function fetchCognitoAttributes(accessToken: string): Promise<CognitoAttribute[] | null> {
  const region = process.env.COGNITO_REGION || 'eu-west-3'
  try {
    const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.GetUser',
      },
      body: JSON.stringify({ AccessToken: accessToken }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { UserAttributes?: CognitoAttribute[] }
    return data.UserAttributes ?? null
  } catch {
    return null
  }
}

function getAttr(attrs: CognitoAttribute[] | null, name: string): string | undefined {
  return attrs?.find((a) => a.Name === name)?.Value
}

type ProvisioningHook = (email: string, userId: string) => Promise<void>

const onFirstAuthenticatedAccessHooks: ProvisioningHook[] = []

export function onFirstAuthenticatedAccess(hook: ProvisioningHook): void {
  onFirstAuthenticatedAccessHooks.push(hook)
}

function runHooks(email: string, userId: string): void {
  for (const hook of onFirstAuthenticatedAccessHooks) {
    Promise.resolve(hook(email, userId)).catch((error) => {
      console.error('[user-provisioning] hook failed', { email, userId, error })
    })
  }
}

function normalizePicture(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function resolveOrProvisionUser(
  token: string,
  payload: TokenPayload
): Promise<AuthUser | null> {
  const [bySub] = await db.select().from(user).where(eq(user.cognitoSub, payload.sub)).limit(1)

  if (bySub) {
    if (bySub.image === null) {
      const attrs = await fetchCognitoAttributes(token)
      const cognitoPicture = normalizePicture(getAttr(attrs, 'picture'))
      if (cognitoPicture) {
        await db
          .update(user)
          .set({ image: cognitoPicture, updatedAt: new Date() })
          .where(eq(user.id, bySub.id))
        return toAuthUser({ ...bySub, image: cognitoPicture })
      }
    }
    return toAuthUser(bySub)
  }

  let cognitoAttrs: CognitoAttribute[] | null = null
  let email = payload.email
  if (!email) {
    cognitoAttrs = await fetchCognitoAttributes(token)
    email = getAttr(cognitoAttrs, 'email')
  }
  if (!email) return null

  const normalizedEmail = email.toLowerCase()

  const [byEmail] = await db.select().from(user).where(eq(user.email, normalizedEmail)).limit(1)

  if (byEmail) {
    cognitoAttrs ??= await fetchCognitoAttributes(token)
    const cognitoName = getAttr(cognitoAttrs, 'name')
    const cognitoPicture = normalizePicture(getAttr(cognitoAttrs, 'picture'))

    const update: Partial<typeof user.$inferInsert> = { cognitoSub: payload.sub }
    if (!byEmail.name && cognitoName) {
      update.name = cognitoName
    }
    if (byEmail.image === null && cognitoPicture) {
      update.image = cognitoPicture
    }
    update.updatedAt = new Date()
    await db.update(user).set(update).where(eq(user.id, byEmail.id))
    if (!byEmail.cognitoSub) {
      runHooks(normalizedEmail, byEmail.id)
    }
    return toAuthUser({ ...byEmail, ...update })
  }

  cognitoAttrs ??= await fetchCognitoAttributes(token)
  const name = getAttr(cognitoAttrs, 'name') ?? ''
  const image = normalizePicture(getAttr(cognitoAttrs, 'picture'))

  const newId = crypto.randomUUID()
  await db.insert(user).values({
    id: newId,
    email: normalizedEmail,
    name,
    emailVerified: true,
    image,
    role: 'member',
    cognitoSub: payload.sub,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  runHooks(normalizedEmail, newId)

  return {
    id: newId,
    email: normalizedEmail,
    name,
    image,
    role: 'member',
  }
}
