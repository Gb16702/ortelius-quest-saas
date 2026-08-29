import type { OnboardingRepositoryPort } from './ports'

export class GetOnboardingStatusUseCase {
  constructor(private readonly onboarding: OnboardingRepositoryPort) {}

  async execute(command: { userId: string }) {
    return await this.onboarding.getOnboardingStatus(command.userId)
  }
}

export class GetOnboardingOrganizationUseCase {
  constructor(private readonly onboarding: OnboardingRepositoryPort) {}

  async execute(command: { userId: string }) {
    return await this.onboarding.getOrganizationByUserId(command.userId)
  }
}

export class GetOnboardingSubscriptionUseCase {
  constructor(private readonly onboarding: OnboardingRepositoryPort) {}

  async execute(command: { organizationId: string }) {
    return await this.onboarding.getActiveSubscriptionForOrganization(command.organizationId)
  }
}

export class HasCompletedOnboardingUseCase {
  constructor(private readonly onboarding: OnboardingRepositoryPort) {}

  async execute(command: { userId: string }) {
    return await this.onboarding.hasUserCompletedOnboarding(command.userId)
  }
}

export class ListOnboardingPlansUseCase {
  constructor(private readonly onboarding: OnboardingRepositoryPort) {}

  async execute() {
    return await this.onboarding.getAvailablePlans()
  }
}

export class CheckOrganizationNameUseCase {
  constructor(private readonly onboarding: OnboardingRepositoryPort) {}

  async execute(command: { name: string }) {
    return await this.onboarding.checkOrganizationNameAvailable(command.name)
  }
}

export class CheckOrganizationSlugUseCase {
  constructor(private readonly onboarding: OnboardingRepositoryPort) {}

  async execute(command: { slug: string }) {
    return await this.onboarding.checkOrganizationSlugAvailable(command.slug)
  }
}
