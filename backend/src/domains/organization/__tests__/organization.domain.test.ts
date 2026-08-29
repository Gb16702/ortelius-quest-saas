import { describe, expect, it } from 'bun:test'
import {
  buildInboundEmailAddress,
  deriveOrganizationSetupStatus,
  deriveOrganizationStatusFlags,
  getBrandColorHex,
  hasRequiredOrganizationRole,
} from '../domain'

describe('Organization domain', () => {
  it('builds inbound email addresses only when intake is enabled', () => {
    expect(buildInboundEmailAddress('quest', true)).toBe('quest@inbound.ortelius.app')
    expect(buildInboundEmailAddress('quest', false)).toBeNull()
  })

  it('derives active, pending, and suspended status flags without infrastructure', () => {
    expect(
      deriveOrganizationStatusFlags({ status: 'active' }, { plan: 'pro', status: 'active' })
    ).toEqual({
      isActive: true,
      isPending: false,
      isSuspended: false,
      requiresSubscription: false,
    })

    expect(deriveOrganizationStatusFlags({ status: 'pending' }, null)).toEqual({
      isActive: false,
      isPending: true,
      isSuspended: false,
      requiresSubscription: true,
    })

    expect(deriveOrganizationStatusFlags({ status: 'suspended' }, null)).toEqual({
      isActive: false,
      isPending: false,
      isSuspended: true,
      requiresSubscription: false,
    })
  })

  it('falls back to the default brand color for unknown keys', () => {
    expect(getBrandColorHex('missing')).toBe('#0103B8')
    expect(getBrandColorHex('#FF66AD')).toBe('#FF66AD')
  })

  it('derives setup completion without requiring legal documents', () => {
    expect(
      deriveOrganizationSetupStatus({
        logo: 'https://cdn.example.com/logo.png',
        tagline: 'Moving cargo',
        overview: '',
        taxIdType: 'vat',
        taxIdNumber: 'BE123',
        servicesCount: 2,
        cargoTypesCount: 1,
        legalDocumentsCount: 0,
        memberCount: 3,
      })
    ).toEqual({
      hasLogo: true,
      hasTagline: true,
      hasOverview: false,
      hasServices: true,
      hasCargoTypes: true,
      hasVatConfig: true,
      hasLegalDocuments: false,
      memberCount: 3,
      isComplete: true,
    })
  })

  it('evaluates organization role hierarchy', () => {
    expect(hasRequiredOrganizationRole('owner', 'admin')).toBe(true)
    expect(hasRequiredOrganizationRole('admin', 'admin')).toBe(true)
    expect(hasRequiredOrganizationRole('member', 'admin')).toBe(false)
    expect(hasRequiredOrganizationRole('unknown', 'member')).toBe(false)
  })
})
