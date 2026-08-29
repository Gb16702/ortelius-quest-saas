import * as v from "valibot"
import { optionalHttpUrlSchema } from "@/shared/lib/validation/url.schema"

export const assistantMessageRoleSchema = v.union([v.literal("user"), v.literal("assistant")])

export const assistantAttachmentSchema = v.object({
    id: v.string(),
    userId: v.string(),
    organizationId: v.nullable(v.string()),
    conversationId: v.nullable(v.string()),
    messageId: v.nullable(v.string()),
    filename: v.string(),
    originalName: v.string(),
    size: v.number(),
    mimeType: v.string(),
    s3Key: v.string(),
    url: optionalHttpUrlSchema,
    downloadUrl: optionalHttpUrlSchema,
    width: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))),
    height: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))),
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const assistantMessageSchema = v.object({
    id: v.string(),
    conversationId: v.string(),
    role: assistantMessageRoleSchema,
    content: v.string(),
    metadata: v.nullable(v.record(v.string(), v.unknown())),
    createdAt: v.string(),
})

export const assistantConversationSchema = v.object({
    id: v.string(),
    userId: v.string(),
    organizationId: v.nullable(v.string()),
    title: v.string(),
    lastRoutePath: v.nullable(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
})

const assistantConversationPartTypeSchema = v.union([
    v.literal("prompt"),
    v.literal("reasoning"),
    v.literal("text"),
    v.literal("action"),
    v.literal("toolCall"),
    v.literal("widget"),
])
const assistantConversationPartRoleSchema = v.union([v.literal("user"), v.literal("assistant")])
const assistantConversationPartStatusSchema = v.union([
    v.literal("streaming"),
    v.literal("completed"),
    v.literal("failed"),
])

export const assistantConversationPartBodyDataSchema = v.object({
    type: v.literal("doc"),
    content: v.array(v.record(v.string(), v.unknown())),
})

export const assistantConversationPartSchema = v.object({
    id: v.string(),
    conversationId: v.string(),
    runId: v.nullable(v.string()),
    type: assistantConversationPartTypeSchema,
    role: assistantConversationPartRoleSchema,
    status: assistantConversationPartStatusSchema,
    content: v.string(),
    metadata: v.optional(v.record(v.string(), v.unknown())),
    bodyData: v.optional(assistantConversationPartBodyDataSchema),
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const assistantConversationProjectionPartSchema = v.object({
    id: v.string(),
    type: assistantConversationPartTypeSchema,
    bodyData: v.optional(assistantConversationPartBodyDataSchema),
    metadata: v.optional(v.record(v.string(), v.unknown())),
    title: v.optional(v.string()),
    userId: v.optional(v.string()),
    toolCall: v.optional(v.record(v.string(), v.unknown())),
    role: v.optional(assistantConversationPartRoleSchema),
    runId: v.optional(v.nullable(v.string())),
    status: v.optional(assistantConversationPartStatusSchema),
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const assistantConversationProjectionSchema = v.object({
    id: v.string(),
    userId: v.string(),
    organizationId: v.nullable(v.string()),
    lastRoutePath: v.nullable(v.string()),
    clientPlatform: v.literal("web"),
    context: v.array(v.record(v.string(), v.unknown())),
    initialSource: v.string(),
    status: v.picklist(["streaming", "complete", "failed"]),
    summary: v.string(),
    parts: v.array(assistantConversationProjectionPartSchema),
    pendingMessages: v.array(assistantConversationProjectionPartSchema),
    readAt: v.nullable(v.string()),
    slugId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const assistantActionStatusSchema = v.union([
    v.literal("proposed"),
    v.literal("executed"),
    v.literal("cancelled"),
    v.literal("expired"),
    v.literal("failed"),
])

export const assistantActionSchema = v.object({
    id: v.string(),
    conversationId: v.nullable(v.string()),
    userId: v.string(),
    organizationId: v.nullable(v.string()),
    type: v.string(),
    status: assistantActionStatusSchema,
    title: v.string(),
    summary: v.string(),
    buttonLabel: v.string(),
    riskLevel: v.string(),
    requiresConfirmation: v.boolean(),
    payload: v.record(v.string(), v.unknown()),
    preview: v.nullable(v.record(v.string(), v.unknown())),
    result: v.nullable(v.record(v.string(), v.unknown())),
    errorMessage: v.nullable(v.string()),
    expiresAt: v.string(),
    confirmedAt: v.nullable(v.string()),
    executedAt: v.nullable(v.string()),
    cancelledAt: v.nullable(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
})

export const assistantActionResponseSchema = v.object({
    success: v.literal(true),
    data: v.object({
        action: assistantActionSchema,
    }),
})

export const assistantMessageCommandResponseSchema = v.object({
    success: v.literal(true),
    data: v.object({
        conversationId: v.string(),
        userMessageId: v.string(),
        assistantMessageId: v.string(),
        runId: v.string(),
        lastSyncId: v.pipe(v.number(), v.integer(), v.minValue(0)),
    }),
})

const assistantSyncOperationSchema = v.picklist(["insert", "update", "delete"])
const assistantSyncModelNameSchema = v.picklist([
    "assistant_conversation",
    "assistant_message",
    "assistant_part",
    "assistant_action",
    "assistant_run",
])

const assistantConversationCreatedSyncPayloadSchema = v.object({
    type: v.literal("conversation_created"),
    conversation: assistantConversationSchema,
})

const assistantConversationUpdatedSyncPayloadSchema = v.object({
    type: v.literal("conversation_updated"),
    conversation: assistantConversationSchema,
})

const assistantTitleUpdatedSyncPayloadSchema = v.object({
    type: v.literal("title_updated"),
    conversationId: v.string(),
    title: v.string(),
    conversation: v.optional(assistantConversationSchema),
})

const assistantConversationDeletedSyncPayloadSchema = v.object({
    type: v.literal("conversation_deleted"),
    conversationId: v.string(),
    deletedAt: v.pipe(v.string(), v.isoTimestamp()),
})

const assistantMessageInsertedSyncPayloadSchema = v.object({
    type: v.literal("message_inserted"),
    message: assistantMessageSchema,
})

const assistantPartStartedSyncPayloadSchema = v.object({
    type: v.literal("part_started"),
    part: assistantConversationPartSchema,
})

const assistantPartDeltaSyncPayloadSchema = v.object({
    type: v.literal("part_delta"),
    partId: v.string(),
    delta: v.string(),
    content: v.optional(v.string()),
})

const assistantPartCompletedSyncPayloadSchema = v.object({
    type: v.literal("part_completed"),
    partId: v.string(),
    content: v.optional(v.string()),
})

const assistantActionSyncPayloadSchema = v.object({
    type: v.picklist(["action_proposed", "action_updated"]),
    action: assistantActionSchema,
})

const assistantRunCompletedSyncPayloadSchema = v.object({
    type: v.literal("run_completed"),
    messageId: v.nullable(v.string()),
    usage: v.optional(v.record(v.string(), v.unknown())),
    completedAt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
})

const assistantRunFailedSyncPayloadSchema = v.object({
    type: v.literal("run_failed"),
    message: v.string(),
    code: v.optional(v.string()),
})

export const assistantSyncPayloadSchema = v.variant("type", [
    assistantConversationCreatedSyncPayloadSchema,
    assistantConversationUpdatedSyncPayloadSchema,
    assistantTitleUpdatedSyncPayloadSchema,
    assistantConversationDeletedSyncPayloadSchema,
    assistantMessageInsertedSyncPayloadSchema,
    assistantPartStartedSyncPayloadSchema,
    assistantPartDeltaSyncPayloadSchema,
    assistantPartCompletedSyncPayloadSchema,
    assistantActionSyncPayloadSchema,
    assistantRunCompletedSyncPayloadSchema,
    assistantRunFailedSyncPayloadSchema,
])

export const assistantSyncActionSchema = v.object({
    syncId: v.pipe(v.number(), v.integer(), v.minValue(0)),
    userId: v.string(),
    organizationId: v.nullable(v.string()),
    conversationId: v.string(),
    modelName: assistantSyncModelNameSchema,
    modelId: v.string(),
    operation: assistantSyncOperationSchema,
    payload: assistantSyncPayloadSchema,
    createdAt: v.pipe(v.string(), v.isoTimestamp()),
})

export const assistantSyncResponseSchema = v.object({
    success: v.literal(true),
    data: v.object({
        firstSyncId: v.pipe(v.number(), v.integer(), v.minValue(0)),
        lastSyncId: v.pipe(v.number(), v.integer(), v.minValue(0)),
        hasMore: v.boolean(),
        actions: v.array(assistantSyncActionSchema),
    }),
})

export const assistantRunCancellationResponseSchema = v.object({
    success: v.literal(true),
    data: v.object({
        conversationId: v.string(),
        runId: v.string(),
        status: v.literal("cancelled"),
    }),
})

export const assistantAttachmentUploadResponseSchema = v.object({
    success: v.literal(true),
    data: v.object({
        attachments: v.array(assistantAttachmentSchema),
    }),
})

export const assistantRecentAttachmentResponseSchema = v.object({
    success: v.literal(true),
    data: v.object({
        attachments: v.array(assistantAttachmentSchema),
    }),
})

export const assistantAttachmentListResponseSchema = v.object({
    success: v.literal(true),
    data: v.object({
        attachments: v.array(assistantAttachmentSchema),
        pagination: v.object({
            limit: v.number(),
            nextCursor: v.nullable(v.string()),
            hasMore: v.boolean(),
        }),
    }),
})
