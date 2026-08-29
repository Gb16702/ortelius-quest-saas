import type {
  OrganizationNameAvailability,
  OrganizationSlugAvailability,
  SubscriptionPlan,
} from './application/onboarding-models'
import { getOnboardingUseCases } from './infrastructure/onboarding-use-cases'

export class OnboardingApplicationService {
  async getOnboardingStatus(userId: string) {
    const useCases = await getOnboardingUseCases()
    return await useCases.getStatus.execute({ userId })
  }

  async getOrganizationByUserId(userId: string) {
    const useCases = await getOnboardingUseCases()
    return await useCases.getOrganization.execute({ userId })
  }

  async getActiveSubscriptionForOrganization(organizationId: string) {
    const useCases = await getOnboardingUseCases()
    return await useCases.getSubscription.execute({ organizationId })
  }

  async hasUserCompletedOnboarding(userId: string): Promise<boolean> {
    const useCases = await getOnboardingUseCases()
    return await useCases.hasCompleted.execute({ userId })
  }

  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    const useCases = await getOnboardingUseCases()
    return await useCases.listPlans.execute()
  }

  async checkOrganizationNameAvailable(name: string): Promise<OrganizationNameAvailability> {
    const useCases = await getOnboardingUseCases()
    return await useCases.checkOrganizationName.execute({ name })
  }

  async checkOrganizationSlugAvailable(slug: string): Promise<OrganizationSlugAvailability> {
    const useCases = await getOnboardingUseCases()
    return await useCases.checkOrganizationSlug.execute({ slug })
  }
}

export const onboardingApplicationService = new OnboardingApplicationService()
