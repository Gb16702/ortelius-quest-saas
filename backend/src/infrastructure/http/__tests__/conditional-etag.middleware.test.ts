import { describe, expect, it } from 'bun:test'
import { shouldSkipEtag } from '../conditional-etag.middleware'

describe('shouldSkipEtag', () => {
  it('keeps etags enabled for assistant message commands', () => {
    expect(shouldSkipEtag('/api/assistant/messages')).toBe(false)
  })

  it('keeps etags enabled for other API routes', () => {
    expect(shouldSkipEtag('/api/assistant/conversations')).toBe(false)
    expect(shouldSkipEtag('/api/health')).toBe(false)
  })
})
