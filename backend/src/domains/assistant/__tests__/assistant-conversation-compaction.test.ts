import { describe, expect, it } from 'bun:test'
import {
  buildAssistantCompactionPlan,
  formatMessagesForSummary,
} from '../application/assistant-conversation-compaction'
import type { AssistantMessage } from '../application/assistant-models'

describe('Assistant conversation compaction', () => {
  it('splits old messages into a summary prefix and keeps recent messages raw', () => {
    const oldMessage = createMessage('user', 'Old context. '.repeat(20_000), 1)
    const recentMessage = createMessage('assistant', 'Recent answer', 2)

    const plan = buildAssistantCompactionPlan({
      previousMessages: [oldMessage, recentMessage],
      currentUserMessage: 'Continue.',
      compactionThresholdTokens: 60_000,
    })

    expect(plan.messagesToSummarize).toEqual([oldMessage])
    expect(plan.remainingMessages).toEqual([recentMessage])
    expect(plan.targetRawTokenLimit).toBe(30_000)
  })

  it('formats messages for summary with explicit roles', () => {
    const formatted = formatMessagesForSummary([
      createMessage('user', 'Where can I change branding?', 1),
      createMessage('assistant', 'Organization settings > Branding.', 2),
    ])

    expect(formatted).toBe(
      '1. User: Where can I change branding?\n\n2. Assistant: Organization settings > Branding.'
    )
  })
})

function createMessage(
  role: AssistantMessage['role'],
  content: string,
  index: number
): AssistantMessage {
  return {
    id: `message-${index}`,
    conversationId: 'conversation-1',
    role,
    content,
    metadata: null,
    createdAt: new Date(`2026-06-11T12:0${index}:00.000Z`),
  }
}
