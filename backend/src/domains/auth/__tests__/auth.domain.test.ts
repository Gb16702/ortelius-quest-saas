import { describe, expect, it } from 'bun:test'
import { getRoleHierarchy, hasRequiredRole, isAuthRole, normalizeAuthEmail } from '../domain'

describe('Auth domain', () => {
  it('normalizes auth emails before lookup', () => {
    expect(normalizeAuthEmail('  TEST@Example.COM ')).toBe('test@example.com')
  })

  it('validates supported roles', () => {
    expect(isAuthRole('viewer')).toBe(true)
    expect(isAuthRole('member')).toBe(true)
    expect(isAuthRole('admin')).toBe(true)
    expect(isAuthRole('owner')).toBe(true)
    expect(isAuthRole('invalid')).toBe(false)
  })

  it('allows higher roles to satisfy lower requirements', () => {
    expect(hasRequiredRole('owner', 'admin')).toBe(true)
    expect(hasRequiredRole('admin', 'member')).toBe(true)
    expect(hasRequiredRole('member', 'viewer')).toBe(true)
    expect(hasRequiredRole('viewer', 'member')).toBe(false)
  })

  it('returns a defensive copy of the role hierarchy', () => {
    const hierarchy = getRoleHierarchy()
    hierarchy.viewer = 99

    expect(getRoleHierarchy().viewer).toBe(1)
  })
})
