import {
    AssistantLiveDeltaMessageSchema,
    AssistantSyncAvailableMessageSchema,
} from "@ortelius/websocket-types/messages"
import * as v from "valibot"
import { safeParseSchema, type ValidationError } from "@/shared/lib/validation/valibot-parse"

const assistantRealtimeMessageTypeSchema = v.object({
    type: v.string(),
})

export type QuestAssistantSyncAvailableParseResult =
    | {
          type: "ignored"
      }
    | {
          type: "invalid"
          messageType: "assistant:sync_available"
          error: ValidationError
      }
    | {
          type: "sync_available"
          latestSyncId: number
      }

export type QuestAssistantLiveDeltaParseResult =
    | {
          type: "ignored"
      }
    | {
          type: "invalid"
          messageType: "assistant:live_delta"
          error: ValidationError
      }
    | {
          type: "live_delta"
          conversationId: string
          partId: string
          runId: string | null
          delta: string
          content: string
      }

export function parseQuestAssistantSyncAvailableMessage(
    message: unknown
): QuestAssistantSyncAvailableParseResult {
    const messageType = safeParseSchema(assistantRealtimeMessageTypeSchema, message)
    if (!messageType.success || messageType.data.type !== "assistant:sync_available") {
        return { type: "ignored" }
    }

    const parsed = safeParseSchema(AssistantSyncAvailableMessageSchema, message)
    if (!parsed.success) {
        return {
            type: "invalid",
            messageType: "assistant:sync_available",
            error: parsed.error,
        }
    }

    return {
        type: "sync_available",
        latestSyncId: parsed.data.latestSyncId,
    }
}

export function parseQuestAssistantLiveDeltaMessage(
    message: unknown
): QuestAssistantLiveDeltaParseResult {
    const messageType = safeParseSchema(assistantRealtimeMessageTypeSchema, message)
    if (!messageType.success || messageType.data.type !== "assistant:live_delta") {
        return { type: "ignored" }
    }

    const parsed = safeParseSchema(AssistantLiveDeltaMessageSchema, message)
    if (!parsed.success) {
        return {
            type: "invalid",
            messageType: "assistant:live_delta",
            error: parsed.error,
        }
    }

    return {
        type: "live_delta",
        conversationId: parsed.data.conversationId,
        partId: parsed.data.partId,
        runId: parsed.data.runId,
        delta: parsed.data.delta,
        content: parsed.data.content,
    }
}
