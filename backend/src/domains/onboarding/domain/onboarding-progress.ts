export interface OnboardingProgress {
  currentStep: 'account' | 'organization' | 'subscription' | 'completed'
}

export function isOnboardingComplete(status: OnboardingProgress): boolean {
  return status.currentStep === 'completed'
}
