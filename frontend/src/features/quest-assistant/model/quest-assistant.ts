import type * as v from "valibot"
import type {
    assistantActionSchema,
    assistantAttachmentSchema,
    assistantConversationPartSchema,
    assistantConversationProjectionPartSchema,
    assistantConversationProjectionSchema,
    assistantConversationSchema,
    assistantMessageSchema,
    assistantSyncActionSchema,
} from "./quest-assistant.schema"

export type AssistantMessage = v.InferOutput<typeof assistantMessageSchema>
export type AssistantAttachment = v.InferOutput<typeof assistantAttachmentSchema>
export type AssistantConversation = v.InferOutput<typeof assistantConversationSchema>
export type AssistantConversationProjection = v.InferOutput<
    typeof assistantConversationProjectionSchema
>
export type AssistantConversationProjectionPart = v.InferOutput<
    typeof assistantConversationProjectionPartSchema
>
export type AssistantAction = v.InferOutput<typeof assistantActionSchema>
export type AssistantConversationPart = v.InferOutput<typeof assistantConversationPartSchema>
export type AssistantConversationPartType = AssistantConversationPart["type"]
export type AssistantConversationPartRole = AssistantConversationPart["role"]
export type AssistantConversationPartStatus = AssistantConversationPart["status"]
export type AssistantSyncAction = v.InferOutput<typeof assistantSyncActionSchema>

export interface AssistantRuntimeContext {
    organizationId?: string
    routePath?: string
}
