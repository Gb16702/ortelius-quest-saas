import { describe, expect, it, mock } from 'bun:test'
import {
  GetOrganizationUserRoleUseCase,
  ListUserOrganizationsUseCase,
} from '../application/organization-membership.use-cases'
import type {
  OrganizationMembershipQueryPort,
  UserOrganizationsQueryPort,
} from '../application/ports'

function createMemberships(role: string | null): OrganizationMembershipQueryPort {
  return {
    findMembership: mock(async () =>
      role
        ? {
            id: 'member-1',
            role,
            organizationId: 'org-1',
            userId: 'user-1',
          }
        : null
    ),
  }
}

function createUserOrganizations(): UserOrganizationsQueryPort {
  return {
    listUserOrganizations: mock(async () => [
      {
        id: 'org-1',
        name: 'Ortelius',
        slug: 'ortelius',
        logo: null,
        role: 'admin',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]),
  }
}

describe('Organization membership use cases', () => {
  it('returns the user role for an organization membership', async () => {
    const memberships = createMemberships('admin')
    const useCase = new GetOrganizationUserRoleUseCase(memberships)

    const role = await useCase.execute({ organizationId: 'org-1', actorId: 'user-1' })

    expect(memberships.findMembership).toHaveBeenCalledWith('user-1', 'org-1')
    expect(role).toBe('admin')
  })

  it('returns null when the user is not a member', async () => {
    const memberships = createMemberships(null)
    const useCase = new GetOrganizationUserRoleUseCase(memberships)

    await expect(useCase.execute({ organizationId: 'org-1', actorId: 'user-1' })).resolves.toBe(
      null
    )
  })

  it('lists organizations for a user through the query port', async () => {
    const organizations = createUserOrganizations()
    const useCase = new ListUserOrganizationsUseCase(organizations)

    const result = await useCase.execute({ userId: 'user-1' })

    expect(result).toEqual([expect.objectContaining({ id: 'org-1', role: 'admin' })])
    expect(organizations.listUserOrganizations).toHaveBeenCalledWith('user-1')
  })
})
