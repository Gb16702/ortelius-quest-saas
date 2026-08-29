import { beforeEach, describe, expect, it } from 'bun:test'
import type { AuthMembership, Organization, RoleHierarchy } from '../application/auth-models'
import type { AuthRepositoryPort } from '../application/ports'

interface AuthRepository extends AuthRepositoryPort {
  hasRequiredRole(userRole: string, requiredRole: string): boolean
  getRoleHierarchy(): RoleHierarchy
  validateRole(role: string): boolean
}

class MockAuthService implements AuthRepository {
  private roleHierarchy: RoleHierarchy = { viewer: 1, member: 2, admin: 3, owner: 4 }
  private users: { email: string; id: string }[] = []
  private memberships: AuthMembership[] = []
  private organizations: Organization[] = []

  async checkUserExistsByEmail(email: string): Promise<boolean> {
    return this.users.some((user) => user.email.toLowerCase() === email.toLowerCase())
  }

  async getUserOrganizationMembership(
    userId: string,
    organizationId: string
  ): Promise<AuthMembership | null> {
    return (
      this.memberships.find(
        (m) => m.organizationId === organizationId && this.users.some((u) => u.id === userId)
      ) || null
    )
  }

  async validateOrganizationExists(organizationId: string): Promise<Organization | null> {
    return this.organizations.find((org) => org.id === organizationId) || null
  }

  hasRequiredRole(userRole: string, requiredRole: string): boolean {
    const userLevel = this.roleHierarchy[userRole]
    const requiredLevel = this.roleHierarchy[requiredRole]

    if (userLevel === undefined || requiredLevel === undefined) {
      return false
    }

    return userLevel >= requiredLevel
  }

  getRoleHierarchy(): RoleHierarchy {
    return { ...this.roleHierarchy }
  }

  validateRole(role: string): boolean {
    return role in this.roleHierarchy
  }

  addUser(email: string, id: string) {
    this.users.push({ email, id })
  }

  addMembership(membership: AuthMembership) {
    this.memberships.push(membership)
  }

  addOrganization(org: Organization) {
    this.organizations.push(org)
  }

  reset() {
    this.users = []
    this.memberships = []
    this.organizations = []
  }
}

describe('AuthService', () => {
  let service: MockAuthService

  beforeEach(() => {
    service = new MockAuthService()
  })

  describe('checkUserExistsByEmail', () => {
    it('should return true when user exists', async () => {
      service.addUser('test@example.com', 'user-123')

      const exists = await service.checkUserExistsByEmail('test@example.com')
      expect(exists).toBe(true)
    })

    it('should return false when user does not exist', async () => {
      const exists = await service.checkUserExistsByEmail('nonexistent@example.com')
      expect(exists).toBe(false)
    })

    it('should be case insensitive', async () => {
      service.addUser('test@example.com', 'user-123')

      const exists = await service.checkUserExistsByEmail('TEST@EXAMPLE.COM')
      expect(exists).toBe(true)
    })
  })

  describe('getUserOrganizationMembership', () => {
    it('should return membership when user is member of organization', async () => {
      service.addUser('test@example.com', 'user-123')
      service.addMembership({
        role: 'admin',
        organizationId: 'org-123',
        organizationName: 'Test Org',
      })

      const membership = await service.getUserOrganizationMembership('user-123', 'org-123')

      expect(membership).toEqual({
        role: 'admin',
        organizationId: 'org-123',
        organizationName: 'Test Org',
      })
    })

    it('should return null when user is not member of organization', async () => {
      service.addUser('test@example.com', 'user-123')

      const membership = await service.getUserOrganizationMembership('user-123', 'org-456')
      expect(membership).toBeNull()
    })

    it('should return null when user does not exist', async () => {
      const membership = await service.getUserOrganizationMembership('nonexistent', 'org-123')
      expect(membership).toBeNull()
    })
  })

  describe('validateOrganizationExists', () => {
    it('should return organization when it exists', async () => {
      service.addOrganization({ id: 'org-123', name: 'Test Organization' })

      const org = await service.validateOrganizationExists('org-123')
      expect(org).toEqual({ id: 'org-123', name: 'Test Organization' })
    })

    it('should return null when organization does not exist', async () => {
      const org = await service.validateOrganizationExists('nonexistent')
      expect(org).toBeNull()
    })
  })

  describe('hasRequiredRole', () => {
    it('should return true when user has required role level', () => {
      expect(service.hasRequiredRole('admin', 'member')).toBe(true)
      expect(service.hasRequiredRole('admin', 'admin')).toBe(true)
      expect(service.hasRequiredRole('member', 'viewer')).toBe(true)
    })

    it('should return false when user does not have required role level', () => {
      expect(service.hasRequiredRole('viewer', 'member')).toBe(false)
      expect(service.hasRequiredRole('member', 'admin')).toBe(false)
      expect(service.hasRequiredRole('viewer', 'admin')).toBe(false)
    })

    it('should handle equal role levels', () => {
      expect(service.hasRequiredRole('viewer', 'viewer')).toBe(true)
      expect(service.hasRequiredRole('member', 'member')).toBe(true)
      expect(service.hasRequiredRole('admin', 'admin')).toBe(true)
    })

    it('should handle invalid role names gracefully', () => {
      expect(service.hasRequiredRole('invalid', 'member')).toBe(false)
      expect(service.hasRequiredRole('member', 'invalid')).toBe(false)
      expect(service.hasRequiredRole('invalid', 'invalid')).toBe(false)
    })
  })

  describe('getRoleHierarchy', () => {
    it('should return the role hierarchy', () => {
      const hierarchy = service.getRoleHierarchy()
      expect(hierarchy).toEqual({ viewer: 1, member: 2, admin: 3, owner: 4 })
    })

    it('should return a copy of the hierarchy', () => {
      const hierarchy1 = service.getRoleHierarchy()
      const hierarchy2 = service.getRoleHierarchy()

      expect(hierarchy1).toEqual(hierarchy2)
      expect(hierarchy1).not.toBe(hierarchy2)
    })
  })

  describe('validateRole', () => {
    it('should return true for valid roles', () => {
      expect(service.validateRole('viewer')).toBe(true)
      expect(service.validateRole('member')).toBe(true)
      expect(service.validateRole('admin')).toBe(true)
      expect(service.validateRole('owner')).toBe(true)
    })

    it('should return false for invalid roles', () => {
      expect(service.validateRole('invalid')).toBe(false)
      expect(service.validateRole('')).toBe(false)
    })
  })

  describe('role hierarchy logic', () => {
    it('should properly order roles by permission level', () => {
      const hierarchy = service.getRoleHierarchy()

      expect(hierarchy.viewer).toBeLessThan(hierarchy.member)
      expect(hierarchy.member).toBeLessThan(hierarchy.admin)
      expect(hierarchy.admin).toBeLessThan(hierarchy.owner)
    })

    it('should allow higher roles to access lower role requirements', () => {
      expect(service.hasRequiredRole('owner', 'admin')).toBe(true)
      expect(service.hasRequiredRole('owner', 'member')).toBe(true)
      expect(service.hasRequiredRole('owner', 'viewer')).toBe(true)

      expect(service.hasRequiredRole('admin', 'member')).toBe(true)
      expect(service.hasRequiredRole('admin', 'viewer')).toBe(true)
      expect(service.hasRequiredRole('admin', 'owner')).toBe(false)

      expect(service.hasRequiredRole('member', 'viewer')).toBe(true)
      expect(service.hasRequiredRole('member', 'admin')).toBe(false)

      expect(service.hasRequiredRole('viewer', 'member')).toBe(false)
      expect(service.hasRequiredRole('viewer', 'admin')).toBe(false)
    })
  })
})
