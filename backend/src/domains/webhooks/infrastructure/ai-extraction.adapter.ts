import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { env } from '../../../infrastructure/config/environment'
import { logAiUsage } from '../../../infrastructure/monitoring/ai-usage.service'
import type { EmailExtractionPort } from '../application/ports'
import type {
  ExtractedRequestData,
  ExtractionContext,
  PostmarkInboundPayload,
} from '../application/webhook-models'

const CargoDetailsSchema = z.object({
  weight: z.number().nullable().describe('Weight in kg'),
  volume: z.number().nullable().describe('Volume in m³'),
  palletCount: z.number().nullable().describe('Number of pallets'),
  fragility: z.enum(['fragile', 'robust']).nullable(),
  dimensions: z
    .object({
      length: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable()
    .describe('Dimensions in cm'),
  options: z
    .object({
      refrigerated: z.boolean(),
      hazardous: z.boolean(),
      oversized: z.boolean(),
    })
    .nullable(),
})

function createExtractionSchema(context: ExtractionContext) {
  const serviceIds = context.availableServices.map((s) => s.id)
  const categoryIds = context.availableCategories.map((c) => c.id)

  return z.object({
    requesterName: z.string().nullable().describe('Full name from signature or body'),
    requesterPhone: z.string().nullable().describe('Phone number'),
    categoryIds: z
      .array(z.string())
      .nullable()
      .describe(`IDs of matched cargo categories. Only use IDs from: ${categoryIds.join(', ')}`),
    serviceIds: z
      .array(z.string())
      .nullable()
      .describe(`IDs of matched services. Only use IDs from: ${serviceIds.join(', ')}`),
    extraServices: z
      .array(z.string())
      .nullable()
      .describe("Services mentioned in email that don't match any available service"),
    cargoDetails: CargoDetailsSchema.nullable(),
    fromDate: z.string().nullable().describe('Departure date in YYYY-MM-DD format'),
    toDate: z.string().nullable().describe('Arrival date in YYYY-MM-DD format'),
  })
}

function buildExtractionPrompt(context: ExtractionContext): string {
  const servicesMap = context.availableServices
    .map((s) => `  - "${s.name}" → ID: ${s.id}`)
    .join('\n')

  const categoriesMap = context.availableCategories
    .map((c) => `  - "${c.name}" → ID: ${c.id}`)
    .join('\n')

  return `You are an assistant specialized in extracting data from logistics service request emails.

Analyze the email and extract structured information.
Return ONLY data explicitly present in the email.
If information is not present, use null.
Do not guess, do not invent.

IMPORTANT - MULTILINGUAL SEMANTIC MATCHING:
The email may be written in ANY language (French, Spanish, German, etc.).
You must semantically match the content to the available options regardless of the language.
Examples:
- "réparation de bateau" (French) → matches "Ship repair"
- "dédouanement" (French) → matches "Customs Clearance"
- "transporte marítimo" (Spanish) → matches "Sea Freight"
- "manutention de conteneurs" (French) → matches "Containerized Cargo Handling"

AVAILABLE SERVICES (return the ID, not the name):
${servicesMap || '  (none configured)'}

AVAILABLE CARGO CATEGORIES (return the ID, not the name):
${categoriesMap || '  (none configured)'}

If a service or category mentioned in the email doesn't match any available option, add it to extraServices as plain text (in the original language).`
}

export class AIExtractionService implements EmailExtractionPort {
  private readonly openai: OpenAI
  private readonly model = 'gpt-5-nano'

  constructor() {
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  }

  async extractFromEmail(
    payload: PostmarkInboundPayload,
    context: ExtractionContext
  ): Promise<ExtractedRequestData> {
    const startedAt = Date.now()
    try {
      const emailContent = `Subject: ${payload.Subject}\n\n${payload.TextBody}`
      const systemPrompt = buildExtractionPrompt(context)
      const schema = createExtractionSchema(context)

      const response = await this.openai.chat.completions.parse({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: emailContent },
        ],
        response_format: zodResponseFormat(schema, 'extraction'),
      })

      void logAiUsage({
        feature: 'request_extraction',
        model: this.model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        durationMs: Date.now() - startedAt,
        success: true,
      })

      const extracted = response.choices[0]?.message?.parsed

      if (!extracted) {
        console.error('[AI Extraction] No parsed response')
        return this.getFallbackData(payload)
      }

      return this.normalizeExtractedData(extracted, payload, context)
    } catch (error) {
      void logAiUsage({
        feature: 'request_extraction',
        model: this.model,
        durationMs: Date.now() - startedAt,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error('[AI Extraction] Error:', error)
      return this.getFallbackData(payload)
    }
  }

  private normalizeExtractedData(
    extracted: {
      requesterName: string | null
      requesterPhone: string | null
      categoryIds: string[] | null
      serviceIds: string[] | null
      extraServices: string[] | null
      cargoDetails: z.infer<typeof CargoDetailsSchema> | null
      fromDate: string | null
      toDate: string | null
    },
    payload: PostmarkInboundPayload,
    context: ExtractionContext
  ): ExtractedRequestData {
    const validServiceIds = new Set(context.availableServices.map((s) => s.id))
    const validCategoryIds = new Set(context.availableCategories.map((c) => c.id))

    const filteredServices = extracted.serviceIds?.filter((id) => validServiceIds.has(id)) || null
    const filteredCategories =
      extracted.categoryIds?.filter((id) => validCategoryIds.has(id)) || null

    return {
      requesterName: extracted.requesterName || payload.FromName || payload.From.split('@')[0],
      requesterPhone: extracted.requesterPhone || null,
      categories: filteredCategories?.length ? filteredCategories : null,
      services: filteredServices?.length ? filteredServices : null,
      extraServices: extracted.extraServices || null,
      cargoDetails: extracted.cargoDetails || null,
      fromDate: extracted.fromDate || null,
      toDate: extracted.toDate || null,
    }
  }

  private getFallbackData(payload: PostmarkInboundPayload): ExtractedRequestData {
    return {
      requesterName: payload.FromName || payload.From.split('@')[0],
      requesterPhone: null,
      categories: null,
      services: null,
      extraServices: null,
      cargoDetails: null,
      fromDate: null,
      toDate: null,
    }
  }
}

export const aiExtractionService = new AIExtractionService()
