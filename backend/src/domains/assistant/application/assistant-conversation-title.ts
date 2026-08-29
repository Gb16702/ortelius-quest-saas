export const DEFAULT_ASSISTANT_CONVERSATION_TITLE = 'New chat'

export interface GenerateAssistantConversationTitleInput {
  userMessage: string
  assistantMessage?: string
}

export interface AssistantConversationTitleGenerator {
  generate(input: GenerateAssistantConversationTitleInput): Promise<string | null>
}

export function sanitizeAssistantConversationTitle(value: string): string | null {
  const firstLine = value
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) return null

  const withoutQuotes = firstLine.replace(/^["'`]+|["'`.]+$/g, '').trim()
  const compact = withoutQuotes.replace(/\s+/g, ' ')

  if (!compact) return null
  if (compact.length <= 60) return compact

  return compact.slice(0, 57).trimEnd()
}
