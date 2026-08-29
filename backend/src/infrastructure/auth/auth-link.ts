import { env } from '../config/environment'

interface AuthLinkOptions {
  email: string
  // Path on FRONTEND_URL the user should land on after a successful auth flow.
  redirectPath?: string
  // Optional explicit absolute URL, used as redirect target instead of
  // building one from FRONTEND_URL + redirectPath.
  redirectUrl?: string
  // Specific auth sub-path (defaults to /auth). e.g. "/auth/sign-in".
  flow?: string
}

export function buildAuthLink(options: AuthLinkOptions): string {
  const flow = options.flow ?? '/auth'
  const redirectUri =
    options.redirectUrl ?? `${env.FRONTEND_URL.replace(/\/$/, '')}${options.redirectPath ?? '/'}`

  const params = new URLSearchParams({
    email: options.email,
    redirect_uri: redirectUri,
  })

  return `${env.AUTH_PORTAL_URL.replace(/\/$/, '')}${flow}?${params.toString()}`
}
