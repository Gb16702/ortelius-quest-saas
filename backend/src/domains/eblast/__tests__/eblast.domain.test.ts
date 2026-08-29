import { describe, expect, it } from 'bun:test'
import { chunkEblastRecipients, isEblastJobExpired, templateDisplayName } from '../domain'

describe('Eblast domain', () => {
  it('chunks recipients using the configured batch size', () => {
    expect(chunkEblastRecipients(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']])
  })

  it('detects jobs older than the retention window', () => {
    const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000)

    expect(isEblastJobExpired(createdAt)).toBe(true)
  })

  it('formats template keys for display', () => {
    expect(templateDisplayName('REQUEST_ONBOARDING')).toBe('Request Onboarding')
  })
})
