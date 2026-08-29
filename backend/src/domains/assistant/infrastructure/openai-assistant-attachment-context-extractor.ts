import OpenAI from 'openai'
import { env } from '../../../infrastructure/config/environment'
import { s3Service } from '../../../infrastructure/storage/s3.service'
import type { AssistantAttachment } from '../application/assistant-models'

const QUEST_ASSISTANT_ATTACHMENT_EXTRACTION_MODEL = 'gpt-5.4-nano'
const QUEST_ASSISTANT_ATTACHMENT_EXTRACTION_MAX_OUTPUT_TOKENS = 1_600

const ATTACHMENT_EXTRACTION_INSTRUCTIONS = `Extract useful context from a file uploaded to Quest Assistant.

Rules:
- Return concise plain text notes for a later assistant response.
- Preserve concrete facts, labels, tables, dates, amounts, statuses, and visible document structure when relevant.
- Do not answer the user's final question.
- Do not invent details.
- Write in English.`

export interface AssistantAttachmentContextExtractor {
  extractPdfContext(attachments: AssistantAttachment[]): Promise<string>
}

export class OpenAIAssistantAttachmentContextExtractor
  implements AssistantAttachmentContextExtractor
{
  private readonly openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  async extractPdfContext(attachments: AssistantAttachment[]): Promise<string> {
    const pdfAttachments = attachments.filter(
      (attachment) => attachment.mimeType === 'application/pdf'
    )
    if (pdfAttachments.length === 0) return ''

    const extracted = await Promise.all(
      pdfAttachments.map(async (attachment) => {
        try {
          const fileBuffer = await s3Service.getFile(attachment.s3Key)
          const fileData = `data:${attachment.mimeType};base64,${fileBuffer.toString('base64')}`
          const response = await this.openai.responses.create({
            model: QUEST_ASSISTANT_ATTACHMENT_EXTRACTION_MODEL,
            instructions: ATTACHMENT_EXTRACTION_INSTRUCTIONS,
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: `Uploaded file name: ${attachment.originalName}\nExtract the content needed to answer future questions about this file.`,
                  },
                  {
                    type: 'input_file',
                    file_data: fileData,
                    filename: attachment.originalName,
                  },
                ],
              },
            ],
            max_output_tokens: QUEST_ASSISTANT_ATTACHMENT_EXTRACTION_MAX_OUTPUT_TOKENS,
            text: { verbosity: 'low' },
            store: false,
            truncation: 'auto',
          })

          const text = response.output_text.trim()
          return text ? `File: ${attachment.originalName}\n${text}` : null
        } catch (error) {
          console.error(`Failed to extract assistant attachment ${attachment.id}:`, error)
          return `File: ${attachment.originalName}\nThe file could not be extracted before this run.`
        }
      })
    )

    return extracted.filter((text): text is string => Boolean(text)).join('\n\n')
  }
}

export const assistantAttachmentContextExtractor = new OpenAIAssistantAttachmentContextExtractor()
