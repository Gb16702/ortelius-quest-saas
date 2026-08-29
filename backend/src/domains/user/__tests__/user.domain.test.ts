import { describe, expect, it } from 'bun:test'
import { requireUserStatus } from '../domain'

describe('User domain', () => {
  it('accepts supported presence statuses', () => {
    expect(requireUserStatus('online')).toBe('online')
    expect(requireUserStatus('away')).toBe('away')
  })

  it('rejects unsupported presence statuses', () => {
    expect(() => requireUserStatus('sleeping')).toThrow('Invalid user status')
  })
})
