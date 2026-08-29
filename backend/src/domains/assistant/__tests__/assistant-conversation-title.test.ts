import { describe, expect, it } from 'bun:test'
import { sanitizeAssistantConversationTitle } from '../application/assistant-conversation-title'

describe('Assistant conversation title', () => {
  it('keeps a compact generated title', () => {
    expect(sanitizeAssistantConversationTitle('Trial status')).toBe('Trial status')
  })

  it('removes quotes, extra lines, and trailing punctuation', () => {
    expect(sanitizeAssistantConversationTitle('"Organization branding."\nExtra text')).toBe(
      'Organization branding'
    )
  })

  it('returns null for empty titles', () => {
    expect(sanitizeAssistantConversationTitle('  \n  ')).toBeNull()
  })
})
