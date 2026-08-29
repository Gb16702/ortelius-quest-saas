import {
  estimateMessagesTokens,
  estimateMessageTokens,
  estimateTextTokens,
} from './assistant-context-window'
import type { AssistantMessage } from './assistant-models'

const RAW_CONTEXT_TARGET_RATIO = 0.5

export interface AssistantCompactionPlanInput {
  previousMessages: AssistantMessage[]
  currentUserMessage: string
  compactionThresholdTokens: number
}

export interface AssistantCompactionPlan {
  messagesToSummarize: AssistantMessage[]
  remainingMessages: AssistantMessage[]
  targetRawTokenLimit: number
}

export interface AssistantConversationCompactorInput {
  previousSummary: string | null
  messages: AssistantMessage[]
}

export interface AssistantConversationCompactorResult {
  summary: string
  tokenEstimate: number
}

export interface AssistantConversationCompactor {
  compact(input: AssistantConversationCompactorInput): Promise<AssistantConversationCompactorResult>
}

export function buildAssistantCompactionPlan(
  input: AssistantCompactionPlanInput
): AssistantCompactionPlan {
  const targetRawTokenLimit = Math.max(
    1_000,
    Math.floor(input.compactionThresholdTokens * RAW_CONTEXT_TARGET_RATIO)
  )
  const currentUserMessageTokens = estimateTextTokens(input.currentUserMessage)
  const remainingMessages: AssistantMessage[] = []
  let selectedTokens = currentUserMessageTokens

  for (const message of input.previousMessages.slice().reverse()) {
    const messageTokens = estimateMessageTokens(message)
    if (remainingMessages.length > 0 && selectedTokens + messageTokens > targetRawTokenLimit) {
      break
    }

    remainingMessages.push(message)
    selectedTokens += messageTokens
  }

  const orderedRemainingMessages = remainingMessages.reverse()
  const messagesToSummarize = input.previousMessages.slice(
    0,
    input.previousMessages.length - orderedRemainingMessages.length
  )

  return {
    messagesToSummarize,
    remainingMessages: orderedRemainingMessages,
    targetRawTokenLimit,
  }
}

export function formatMessagesForSummary(messages: AssistantMessage[]): string {
  return messages
    .map((message, index) => {
      const role = message.role === 'assistant' ? 'Assistant' : 'User'
      return `${index + 1}. ${role}: ${message.content}`
    })
    .join('\n\n')
}

export function estimateSummaryTokens(summary: string): number {
  return estimateTextTokens(summary)
}

export function shouldCompactConversation(input: {
  previousMessages: AssistantMessage[]
  currentUserMessage: string
  summary: string | null
  compactionThresholdTokens: number
}): boolean {
  const summaryTokens = input.summary ? estimateTextTokens(input.summary) : 0
  const rawTokens =
    estimateMessagesTokens(input.previousMessages) + estimateTextTokens(input.currentUserMessage)

  return summaryTokens + rawTokens > input.compactionThresholdTokens
}
