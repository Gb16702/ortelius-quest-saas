import type { AssistantMessage, AssistantMessageRole } from './assistant-models'

const APPROX_CHARS_PER_TOKEN = 4
const MESSAGE_TOKEN_OVERHEAD = 8

export interface AssistantContextMessage {
  role: AssistantMessageRole
  content: string
}

export interface BuildAssistantContextWindowInput {
  previousMessages: AssistantMessage[]
  currentUserMessage: string
  conversationSummary?: AssistantConversationSummary | null
  compactionThresholdTokens: number
  hardLimitTokens: number
}

export interface AssistantConversationSummary {
  content: string
  tokenEstimate?: number
}

export interface AssistantContextWindow {
  messages: AssistantContextMessage[]
  estimatedTotalTokens: number
  estimatedSelectedTokens: number
  compactionNeeded: boolean
  omittedMessageCount: number
}

export function buildAssistantContextWindow(
  input: BuildAssistantContextWindowInput
): AssistantContextWindow {
  const currentMessage: AssistantContextMessage = {
    role: 'user',
    content: input.currentUserMessage,
  }
  const summaryMessage = input.conversationSummary?.content
    ? toSummaryMessage(input.conversationSummary.content)
    : null
  const previousMessages = input.previousMessages.map(toContextMessage)
  const rawMessages = [...previousMessages, currentMessage]
  const summaryTokens = summaryMessage ? estimateMessageTokens(summaryMessage) : 0
  const estimatedTotalTokens = summaryTokens + estimateMessagesTokens(rawMessages)
  const compactionNeeded = estimatedTotalTokens > input.compactionThresholdTokens
  const rawSelectionLimit =
    (compactionNeeded ? input.compactionThresholdTokens : input.hardLimitTokens) - summaryTokens
  const selectedRawMessages = selectRecentMessagesWithinTokenLimit(
    rawMessages,
    Math.max(0, rawSelectionLimit)
  )
  const selectedMessages = summaryMessage
    ? [summaryMessage, ...selectedRawMessages]
    : selectedRawMessages
  const hardLimitedRawMessages =
    estimateMessagesTokens(selectedMessages) > input.hardLimitTokens
      ? selectRecentMessagesWithinTokenLimit(
          selectedRawMessages,
          Math.max(0, input.hardLimitTokens - summaryTokens)
        )
      : selectedRawMessages
  const hardLimitedMessages = summaryMessage
    ? [summaryMessage, ...hardLimitedRawMessages]
    : hardLimitedRawMessages

  return {
    messages: hardLimitedMessages,
    estimatedTotalTokens,
    estimatedSelectedTokens: estimateMessagesTokens(hardLimitedMessages),
    compactionNeeded,
    omittedMessageCount: Math.max(0, rawMessages.length - hardLimitedRawMessages.length),
  }
}

export function estimateMessagesTokens(messages: AssistantContextMessage[]): number {
  return messages.reduce((total, message) => total + estimateMessageTokens(message), 0)
}

export function estimateMessageTokens(message: AssistantContextMessage): number {
  return estimateTextTokens(message.content) + MESSAGE_TOKEN_OVERHEAD
}

export function estimateTextTokens(value: string): number {
  if (value.length === 0) return 0

  return Math.ceil(value.length / APPROX_CHARS_PER_TOKEN)
}

function selectRecentMessagesWithinTokenLimit(
  messages: AssistantContextMessage[],
  tokenLimit: number
): AssistantContextMessage[] {
  const selected: AssistantContextMessage[] = []
  let selectedTokens = 0

  for (const message of messages.slice().reverse()) {
    const messageTokens = estimateMessageTokens(message)
    if (selected.length > 0 && selectedTokens + messageTokens > tokenLimit) break

    selected.push(message)
    selectedTokens += messageTokens
  }

  return selected.reverse()
}

function toContextMessage(message: AssistantMessage): AssistantContextMessage {
  return {
    role: message.role,
    content: message.content,
  }
}

function toSummaryMessage(summary: string): AssistantContextMessage {
  return {
    role: 'assistant',
    content: `Conversation summary so far:\n${summary}`,
  }
}
