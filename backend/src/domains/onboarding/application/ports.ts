import type {
  OnboardingStepStatus,
  OrganizationNameAvailability,
  OrganizationSlugAvailability,
  SubscriptionPlan,
} from './onboarding-models'

export interface OnboardingRepositoryPort {
  getOnboardingStatus(userId: string): Promise<OnboardingStepStatus>
  getOrganizationByUserId(userId: string): Promise<{ id: string } | null>
  getActiveSubscriptionForOrganization(organizationId: string): Promise<unknown | null>
  hasUserCompletedOnboarding(userId: string): Promise<boolean>
  getAvailablePlans(): Promise<SubscriptionPlan[]>
  checkOrganizationNameAvailable(name: string): Promise<OrganizationNameAvailability>
  checkOrganizationSlugAvailable(slug: string): Promise<OrganizationSlugAvailability>
}
