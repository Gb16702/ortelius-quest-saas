import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  CheckOrganizationNameUseCase,
  CheckOrganizationSlugUseCase,
  GetOnboardingStatusUseCase,
  HasCompletedOnboardingUseCase,
  ListOnboardingPlansUseCase,
} from '../application/onboarding-use-cases'

const repository = {
  getOnboardingStatus: mock(async () => ({
    accountCreated: true,
    organizationCreated: true,
    subscriptionActive: false,
    currentStep: 'subscription' as const,
  })),
  getOrganizationByUserId: mock(async () => ({ id: 'org-123' })),
  getActiveSubscriptionForOrganization: mock(async () => null),
  hasUserCompletedOnboarding: mock(async () => false),
  getAvailablePlans: mock(async () => []),
  checkOrganizationNameAvailable: mock(async () => ({ available: true, slug: 'ortelius' })),
  checkOrganizationSlugAvailable: mock(async () => ({ available: true, slug: 'ortelius' })),
}

describe('Onboarding use cases', () => {
  beforeEach(() => {
    Object.values(repository).forEach((fn) => fn.mockClear())
  })

  it('loads onboarding status through the repository port', async () => {
    await expect(
      new GetOnboardingStatusUseCase(repository).execute({ userId: 'user-123' })
    ).resolves.toMatchObject({
      currentStep: 'subscription',
    })

    expect(repository.getOnboardingStatus).toHaveBeenCalledWith('user-123')
  })

  it('checks completion through the repository port', async () => {
    await expect(
      new HasCompletedOnboardingUseCase(repository).execute({ userId: 'user-123' })
    ).resolves.toBe(false)

    expect(repository.hasUserCompletedOnboarding).toHaveBeenCalledWith('user-123')
  })

  it('lists plans and checks organization names and slugs through repository ports', async () => {
    await expect(new ListOnboardingPlansUseCase(repository).execute()).resolves.toEqual([])
    await expect(
      new CheckOrganizationNameUseCase(repository).execute({ name: 'Ortelius' })
    ).resolves.toEqual({ available: true, slug: 'ortelius' })
    await expect(
      new CheckOrganizationSlugUseCase(repository).execute({ slug: 'ortelius' })
    ).resolves.toEqual({ available: true, slug: 'ortelius' })

    expect(repository.getAvailablePlans).toHaveBeenCalledTimes(1)
    expect(repository.checkOrganizationNameAvailable).toHaveBeenCalledWith('Ortelius')
    expect(repository.checkOrganizationSlugAvailable).toHaveBeenCalledWith('ortelius')
  })
})
