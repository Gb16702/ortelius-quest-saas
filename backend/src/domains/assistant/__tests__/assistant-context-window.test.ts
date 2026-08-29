import { describe, expect, it } from 'bun:test'
import {
  buildAssistantContextWindow,
  estimateTextTokens,
} from '../application/assistant-context-window'
import type { AssistantMessage } from '../application/assistant-models'

describe('Assistant context window', () => {
  it('keeps the full conversation window while it is below the compaction threshold', () => {
    const window = buildAssistantContextWindow({
      previousMessages: [
        createMessage('user', 'Where can I update branding?'),
        createMessage('assistant', 'Go to Organization settings > Branding.'),
      ],
      currentUserMessage: 'Open that page.',
      compactionThresholdTokens: 1_000,
      hardLimitTokens: 2_000,
    })

    expect(window.compactionNeeded).toBe(false)
    expect(window.omittedMessageCount).toBe(0)
    expect(window.messages).toEqual([
      { role: 'user', content: 'Where can I update branding?' },
      { role: 'assistant', content: 'Go to Organization settings > Branding.' },
      { role: 'user', content: 'Open that page.' },
    ])
  })

  it('keeps recent messages when the full conversation exceeds the compaction threshold', () => {
    const window = buildAssistantContextWindow({
      previousMessages: [
        createMessage('user', 'A'.repeat(1_200)),
        createMessage('assistant', 'B'.repeat(1_200)),
        createMessage('user', 'Recent detail'),
        createMessage('assistant', 'Recent answer'),
      ],
      currentUserMessage: 'Continue from there.',
      compactionThresholdTokens: 120,
      hardLimitTokens: 1_000,
    })

    expect(window.compactionNeeded).toBe(true)
    expect(window.omittedMessageCount).toBe(2)
    expect(window.messages).toEqual([
      { role: 'user', content: 'Recent detail' },
      { role: 'assistant', content: 'Recent answer' },
      { role: 'user', content: 'Continue from there.' },
    ])
    expect(window.estimatedSelectedTokens).toBeLessThanOrEqual(120)
  })

  it('uses the hard limit as a safety cap for selected context', () => {
    const window = buildAssistantContextWindow({
      previousMessages: [
        createMessage('user', 'Old message'),
        createMessage('assistant', 'Recent answer '.repeat(50)),
      ],
      currentUserMessage: 'Current question',
      compactionThresholdTokens: 10_000,
      hardLimitTokens: 40,
    })

    expect(window.compactionNeeded).toBe(false)
    expect(window.messages).toEqual([{ role: 'user', content: 'Current question' }])
    expect(window.estimatedSelectedTokens).toBeLessThanOrEqual(40)
  })

  it('keeps the conversation summary before recent raw messages', () => {
    const window = buildAssistantContextWindow({
      conversationSummary: {
        content: 'The user is working on organization branding.',
      },
      previousMessages: [createMessage('assistant', 'Recent answer')],
      currentUserMessage: 'What page was that?',
      compactionThresholdTokens: 1_000,
      hardLimitTokens: 2_000,
    })

    expect(window.messages).toEqual([
      {
        role: 'assistant',
        content: 'Conversation summary so far:\nThe user is working on organization branding.',
      },
      { role: 'assistant', content: 'Recent answer' },
      { role: 'user', content: 'What page was that?' },
    ])
  })

  it('estimates text tokens conservatively from character length', () => {
    expect(estimateTextTokens('')).toBe(0)
    expect(estimateTextTokens('abcd')).toBe(1)
    expect(estimateTextTokens('abcde')).toBe(2)
  })
})

function createMessage(role: AssistantMessage['role'], content: string): AssistantMessage {
  return {
    id: `${role}-${content.length}`,
    conversationId: 'conversation-1',
    role,
    content,
    metadata: null,
    createdAt: new Date('2026-06-11T12:00:00.000Z'),
  }
}
