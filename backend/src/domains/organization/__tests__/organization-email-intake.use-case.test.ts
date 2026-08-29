import { describe, expect, it, mock } from 'bun:test'
import { UpdateOrganizationEmailIntakeUseCase } from '../application/organization-email-intake.use-case'
import {
  OrganizationNotFoundError,
  OrganizationPermissionError,
} from '../application/organization-errors'
import type {
  OrganizationEmailIntakeRepositoryPort,
  OrganizationMembershipQueryPort,
  OrganizationSettingNotificationPort,
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

function createEmailIntake(slug: string | null = 'quest'): OrganizationEmailIntakeRepositoryPort {
  return {
    findSlug: mock(async () => slug),
    setEmailIntakeEnabled: mock(async () => undefined),
  }
}

function createNotifications(): OrganizationSettingNotificationPort {
  return {
    notifySettingChange: mock(async () => undefined),
  }
}

describe('Organization email intake use case', () => {
  it('updates email intake and notifies team chat for admins', async () => {
    const emailIntake = createEmailIntake()
    const notifications = createNotifications()
    const useCase = new UpdateOrganizationEmailIntakeUseCase(
      createMemberships('admin'),
      emailIntake,
      notifications
    )

    const result = await useCase.execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      enabled: true,
    })

    expect(emailIntake.setEmailIntakeEnabled).toHaveBeenCalledWith('org-1', true)
    expect(notifications.notifySettingChange).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'Email Intake',
      true
    )
    expect(result).toEqual({ success: true, emailAddress: 'quest@inbound.ortelius.app' })
  })

  it('rejects non-admin members before loading organization slug', async () => {
    const emailIntake = createEmailIntake()
    const useCase = new UpdateOrganizationEmailIntakeUseCase(
      createMemberships('member'),
      emailIntake,
      createNotifications()
    )

    await expect(
      useCase.execute({ organizationId: 'org-1', actorId: 'user-1', enabled: true })
    ).rejects.toThrow(OrganizationPermissionError)
    expect(emailIntake.findSlug).not.toHaveBeenCalled()
  })

  it('returns a typed not found error when the organization has no slug', async () => {
    const useCase = new UpdateOrganizationEmailIntakeUseCase(
      createMemberships('owner'),
      createEmailIntake(null),
      createNotifications()
    )

    await expect(
      useCase.execute({ organizationId: 'org-1', actorId: 'user-1', enabled: true })
    ).rejects.toThrow(OrganizationNotFoundError)
  })
})
