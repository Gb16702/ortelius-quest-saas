import { describe, expect, it } from 'bun:test'
import { isOnboardingComplete } from '../domain'

describe('Onboarding domain', () => {
  it('detects completed progress from the current step', () => {
    expect(isOnboardingComplete({ currentStep: 'completed' })).toBe(true)
    expect(isOnboardingComplete({ currentStep: 'subscription' })).toBe(false)
  })
})
