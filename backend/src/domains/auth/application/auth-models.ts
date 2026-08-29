import type { RoleHierarchy } from '../domain'

export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string | null
  role: string
  dominantColor?: string
}

export type AuthVariables = {
  user: AuthUser | null
  isAuthenticated: boolean
}

export interface AuthMembership {
  role: string
  organizationId: string
  organizationName: string
}

export interface CheckAuthProviderRequest {
  email: string
}

export interface CheckAuthProviderResponse {
  has_email_password: boolean
  has_sso_provider: boolean
}

export interface Organization {
  id: string
  name: string
}

export type { RoleHierarchy }
