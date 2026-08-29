import { beforeEach, describe, expect, it } from 'bun:test'
import type { AuthMembership, Organization } from '../application/auth-models'
import {
  CheckAuthProviderUseCase,
  GetRoleHierarchyUseCase,
  GetUserOrganizationMembershipUseCase,
  HasRequiredRoleUseCase,
  ValidateOrganizationExistsUseCase,
  ValidateRoleUseCase,
} from '../application/auth-use-cases'
import type { AuthRepositoryPort } from '../application/ports'

class InMemoryAuthRepository implements AuthRepositoryPort {
  users: string[] = []
  memberships = new Map<string, AuthMembership>()
  organizations = new Map<string, Organization>()

  async checkUserExistsByEmail(email: string): Promise<boolean> {
    return this.users.includes(email)
  }

  async getUserOrganizationMembership(
    userId: string,
    organizationId: string
  ): Promise<AuthMembership | null> {
    return this.memberships.get(`${userId}:${organizationId}`) ?? null
  }

  async validateOrganizationExists(organizationId: string): Promise<Organization | null> {
    return this.organizations.get(organizationId) ?? null
  }
}

describe('Auth use cases', () => {
  let repository: InMemoryAuthRepository

  beforeEach(() => {
    repository = new InMemoryAuthRepository()
  })

  it('checks auth provider through the repository with normalized email', async () => {
    repository.users.push('test@example.com')

    const result = await new CheckAuthProviderUseCase(repository).execute({
      email: ' TEST@Example.COM ',
    })

    expect(result).toEqual({
      has_email_password: true,
      has_sso_provider: false,
    })
  })

  it('returns organization membership through the repository port', async () => {
    repository.memberships.set('user-1:org-1', {
      role: 'admin',
      organizationId: 'org-1',
      organizationName: 'Quest',
    })

    const membership = await new GetUserOrganizationMembershipUseCase(repository).execute({
      userId: 'user-1',
      organizationId: 'org-1',
    })

    expect(membership?.role).toBe('admin')
  })

  it('validates organization existence through the repository port', async () => {
    repository.organizations.set('org-1', { id: 'org-1', name: 'Quest' })

    const organization = await new ValidateOrganizationExistsUseCase(repository).execute({
      organizationId: 'org-1',
    })

    expect(organization).toEqual({ id: 'org-1', name: 'Quest' })
  })

  it('keeps role decisions in application use cases backed by domain rules', () => {
    expect(
      new HasRequiredRoleUseCase().execute({ userRole: 'admin', requiredRole: 'member' })
    ).toBe(true)
    expect(new ValidateRoleUseCase().execute({ role: 'owner' })).toBe(true)
    expect(new GetRoleHierarchyUseCase().execute()).toEqual({
      viewer: 1,
      member: 2,
      admin: 3,
      owner: 4,
    })
  })
})
