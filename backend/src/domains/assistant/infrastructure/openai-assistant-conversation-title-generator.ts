import OpenAI from 'openai'
import { env } from '../../../infrastructure/config/environment'
import {
  type AssistantConversationTitleGenerator,
  type GenerateAssistantConversationTitleInput,
  sanitizeAssistantConversationTitle,
} from '../application/assistant-conversation-title'

const QUEST_ASSISTANT_TITLE_MODEL = 'gpt-5.4-nano'
const QUEST_ASSISTANT_TITLE_MAX_OUTPUT_TOKENS = 24

const TITLE_INSTRUCTIONS = `Generate a short title for a Quest Assistant chat.

Rules:
- Return only the title.
- Use 2 to 6 words.
- Write in English.
- Use sentence case.
- Do not use quotes.
- Do not copy the user's message verbatim.
- Do not end with a period.
- Prefer the user's actual task or topic over generic labels.`

function buildTitleInput(input: GenerateAssistantConversationTitleInput): string {
  const assistantResponse = input.assistantMessage?.trim()
    ? `\n\nAssistant response:\n${input.assistantMessage.trim()}`
    : ''

  return `User message:\n${input.userMessage}${assistantResponse}`
}

export class OpenAIAssistantConversationTitleGenerator
  implements AssistantConversationTitleGenerator
{
  private readonly openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  async generate(input: GenerateAssistantConversationTitleInput): Promise<string | null> {
    const response = await this.openai.responses.create({
      model: QUEST_ASSISTANT_TITLE_MODEL,
      instructions: TITLE_INSTRUCTIONS,
      input: buildTitleInput(input),
      max_output_tokens: QUEST_ASSISTANT_TITLE_MAX_OUTPUT_TOKENS,
      text: { verbosity: 'low' },
      store: false,
      truncation: 'auto',
    })

    return sanitizeAssistantConversationTitle(response.output_text)
  }
}

export const assistantConversationTitleGenerator = new OpenAIAssistantConversationTitleGenerator()
