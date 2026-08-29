import { db } from '../database'
import { aiUsageLog } from '../database/db/schemas/ai-usage-log-schema'

export interface AiUsageEntry {
  feature: string
  model: string
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  durationMs?: number
  success: boolean
  error?: string
  metadata?: Record<string, unknown>
}

export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  try {
    await db.insert(aiUsageLog).values({
      feature: entry.feature,
      model: entry.model,
      promptTokens: entry.promptTokens ?? null,
      completionTokens: entry.completionTokens ?? null,
      totalTokens: entry.totalTokens ?? null,
      durationMs: entry.durationMs,
      success: entry.success,
      error: entry.error,
      metadata: entry.metadata ?? null,
    })
  } catch (err) {
    console.error('[ai-usage] log failed', err)
  }
}
