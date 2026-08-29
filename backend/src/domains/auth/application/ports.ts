import type { AuthMembership, Organization } from './auth-models'

export interface AuthRepositoryPort {
  checkUserExistsByEmail(email: string): Promise<boolean>
  getUserOrganizationMembership(
    userId: string,
    organizationId: string
  ): Promise<AuthMembership | null>
  validateOrganizationExists(organizationId: string): Promise<Organization | null>
}
