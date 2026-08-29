import OpenAI from 'openai'
import { env } from '../../../infrastructure/config/environment'
import {
  type AssistantConversationCompactor,
  type AssistantConversationCompactorInput,
  type AssistantConversationCompactorResult,
  estimateSummaryTokens,
  formatMessagesForSummary,
} from '../application/assistant-conversation-compaction'

const QUEST_ASSISTANT_SUMMARY_MODEL = 'gpt-5.4-nano'
const QUEST_ASSISTANT_SUMMARY_MAX_OUTPUT_TOKENS = 1_200

const SUMMARY_INSTRUCTIONS = `You compact Quest Assistant conversation history.

Write a concise memory summary for future assistant turns.

Rules:
- Preserve durable facts, user goals, decisions, constraints, organization context, permissions, route/page references, unresolved tasks, and assistant promises.
- Preserve important user preferences about assistant behavior.
- Remove greetings, filler, duplicated wording, and transient UI chatter.
- Do not invent details.
- Write in English.
- Use compact plain text with short bullets when useful.
- Do not mention that this is an AI-generated summary.`

function buildSummaryInput(input: AssistantConversationCompactorInput): string {
  const previousSummary = input.previousSummary?.trim()
    ? `Existing conversation summary:\n${input.previousSummary.trim()}\n\n`
    : ''

  return `${previousSummary}New messages to merge into the summary:\n${formatMessagesForSummary(input.messages)}`
}

export class OpenAIAssistantConversationCompactor implements AssistantConversationCompactor {
  private readonly openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  async compact(
    input: AssistantConversationCompactorInput
  ): Promise<AssistantConversationCompactorResult> {
    const response = await this.openai.responses.create({
      model: QUEST_ASSISTANT_SUMMARY_MODEL,
      instructions: SUMMARY_INSTRUCTIONS,
      input: buildSummaryInput(input),
      max_output_tokens: QUEST_ASSISTANT_SUMMARY_MAX_OUTPUT_TOKENS,
      text: { verbosity: 'low' },
      store: false,
      truncation: 'auto',
    })
    const summary = response.output_text.trim()

    if (!summary) {
      throw new Error('Assistant conversation compaction returned an empty summary')
    }

    return {
      summary,
      tokenEstimate: estimateSummaryTokens(summary),
    }
  }
}

export const assistantConversationCompactor = new OpenAIAssistantConversationCompactor()
