import {
  CheckOrganizationNameUseCase,
  CheckOrganizationSlugUseCase,
  GetOnboardingOrganizationUseCase,
  GetOnboardingStatusUseCase,
  GetOnboardingSubscriptionUseCase,
  HasCompletedOnboardingUseCase,
  ListOnboardingPlansUseCase,
} from '../application/onboarding-use-cases'
import { DrizzleOnboardingRepository } from './onboarding.repository'

let onboardingUseCases: {
  getStatus: GetOnboardingStatusUseCase
  getOrganization: GetOnboardingOrganizationUseCase
  getSubscription: GetOnboardingSubscriptionUseCase
  hasCompleted: HasCompletedOnboardingUseCase
  listPlans: ListOnboardingPlansUseCase
  checkOrganizationName: CheckOrganizationNameUseCase
  checkOrganizationSlug: CheckOrganizationSlugUseCase
} | null = null

export async function getOnboardingUseCases() {
  if (!onboardingUseCases) {
    const repository = new DrizzleOnboardingRepository()

    onboardingUseCases = {
      getStatus: new GetOnboardingStatusUseCase(repository),
      getOrganization: new GetOnboardingOrganizationUseCase(repository),
      getSubscription: new GetOnboardingSubscriptionUseCase(repository),
      hasCompleted: new HasCompletedOnboardingUseCase(repository),
      listPlans: new ListOnboardingPlansUseCase(repository),
      checkOrganizationName: new CheckOrganizationNameUseCase(repository),
      checkOrganizationSlug: new CheckOrganizationSlugUseCase(repository),
    }
  }

  return onboardingUseCases
}
