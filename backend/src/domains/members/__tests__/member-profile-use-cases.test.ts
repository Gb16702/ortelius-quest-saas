import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { GetMemberProfileUseCase } from '../application/member-profile-use-cases'
import {
  MemberProfileNotFoundError,
  MemberProfilePermissionError,
  normalizeMemberRole,
} from '../domain'

const joinedAt = new Date('2026-05-01T00:00:00.000Z')
const createdAt = new Date('2026-05-02T00:00:00.000Z')

const requestingMembership = {
  id: 'membership-requesting',
  userId: 'requesting-user',
  organizationId: 'org-123',
  role: 'admin',
  joinedAt,
}

const targetMembership = {
  id: 'membership-target',
  userId: 'target-user',
  organizationId: 'org-123',
  role: 'member',
  joinedAt,
}

const targetUser = {
  id: 'target-user',
  name: 'Target User',
  email: 'target@example.com',
  image: null,
  dominantColor: '#123456',
  createdAt,
}

const assignedRequest = {
  id: 'request-1',
  requestNumber: 'REQ-1',
  lifecycleStatus: 'open',
  closedReason: null,
  categories: ['cargo'],
  services: ['transport'],
  createdAt,
}

const repository = {
  findMembershipByUserId: mock(() => Promise.resolve(requestingMembership)),
  findMembershipInOrganization: mock(() => Promise.resolve(targetMembership)),
  findUserById: mock(() => Promise.resolve(targetUser)),
  listAssignedRequests: mock(() => Promise.resolve([assignedRequest])),
}

describe('Member profile use case', () => {
  beforeEach(() => {
    Object.values(repository).forEach((fn) => fn.mockClear())
    repository.findMembershipByUserId.mockResolvedValue(requestingMembership)
    repository.findMembershipInOrganization.mockResolvedValue(targetMembership)
    repository.findUserById.mockResolvedValue(targetUser)
    repository.listAssignedRequests.mockResolvedValue([assignedRequest])
  })

  it('builds a member profile through repository ports', async () => {
    await expect(
      new GetMemberProfileUseCase(repository).execute({
        userId: 'target-user',
        requestingUserId: 'requesting-user',
      })
    ).resolves.toEqual({
      user: targetUser,
      membership: {
        id: 'membership-target',
        organizationId: 'org-123',
        role: 'member',
        joinedAt,
      },
      assignedRequests: [assignedRequest],
    })

    expect(repository.findMembershipByUserId).toHaveBeenCalledWith('requesting-user')
    expect(repository.findMembershipInOrganization).toHaveBeenCalledWith('target-user', 'org-123')
    expect(repository.findUserById).toHaveBeenCalledWith('target-user')
    expect(repository.listAssignedRequests).toHaveBeenCalledWith('target-user', 'org-123')
  })

  it('rejects requesters outside any organization', async () => {
    repository.findMembershipByUserId.mockResolvedValue(null)

    await expect(
      new GetMemberProfileUseCase(repository).execute({
        userId: 'target-user',
        requestingUserId: 'requesting-user',
      })
    ).rejects.toThrow(MemberProfilePermissionError)

    expect(repository.findMembershipInOrganization).not.toHaveBeenCalled()
  })

  it('rejects targets outside the requester organization', async () => {
    repository.findMembershipInOrganization.mockResolvedValue(null)

    await expect(
      new GetMemberProfileUseCase(repository).execute({
        userId: 'target-user',
        requestingUserId: 'requesting-user',
      })
    ).rejects.toThrow(MemberProfilePermissionError)

    expect(repository.findUserById).not.toHaveBeenCalled()
  })

  it('reports a missing target user separately from membership authorization', async () => {
    repository.findUserById.mockResolvedValue(null)

    await expect(
      new GetMemberProfileUseCase(repository).execute({
        userId: 'target-user',
        requestingUserId: 'requesting-user',
      })
    ).rejects.toThrow(MemberProfileNotFoundError)

    expect(repository.listAssignedRequests).not.toHaveBeenCalled()
  })
})

describe('Member profile domain', () => {
  it('normalizes supported roles and rejects unknown roles', () => {
    expect(normalizeMemberRole('owner')).toBe('owner')
    expect(normalizeMemberRole('admin')).toBe('admin')
    expect(normalizeMemberRole('member')).toBe('member')
    expect(() => normalizeMemberRole('viewer')).toThrow('Unsupported member role: viewer')
  })
})
