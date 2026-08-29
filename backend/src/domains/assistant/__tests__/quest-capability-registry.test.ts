import { describe, expect, it } from 'bun:test'
import {
  canRoleAccessCapability,
  findQuestCapabilityByRoutePath,
  searchQuestCapabilities,
} from '../application/quest-capability-registry'

describe('Quest capability registry', () => {
  it('finds organization branding for tagline questions', () => {
    const [capability] = searchQuestCapabilities({ query: 'where can I edit the org tagline' })

    expect(capability?.id).toBe('organization-branding')
    expect(capability?.routePattern).toBe('/org/:slug/settings/branding')
  })

  it('finds organization branding for fuzzy public profile wording', () => {
    const [capability] = searchQuestCapabilities({
      query: 'sentence shown on my public company page',
    })

    expect(capability?.id).toBe('organization-branding')
  })

  it('finds invoice settings for invoice language questions', () => {
    const [capability] = searchQuestCapabilities({ query: 'change invoice language' })

    expect(capability?.id).toBe('invoice-settings')
    expect(capability?.routePattern).toBe('/org/:slug/settings/invoices')
  })

  it('caps search results to the requested limit', () => {
    const capabilities = searchQuestCapabilities({ query: 'settings', limit: 2 })

    expect(capabilities).toHaveLength(2)
  })

  it('checks capability access through the membership role hierarchy', () => {
    const [capability] = searchQuestCapabilities({ query: 'tagline' })
    if (!capability) throw new Error('Expected tagline capability')

    expect(capability.requiredRole).toBe('admin')
    expect(canRoleAccessCapability({ role: 'member', capability })).toBe(false)
    expect(canRoleAccessCapability({ role: 'admin', capability })).toBe(true)
    expect(canRoleAccessCapability({ role: 'owner', capability })).toBe(true)
  })

  it('matches concrete organization routes back to capabilities', () => {
    const capability = findQuestCapabilityByRoutePath('/org/ortelius/settings/branding')

    expect(capability?.id).toBe('organization-branding')
  })
})
