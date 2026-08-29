import { z } from 'zod'

export const assistantMessageRequestSchema = z
  .object({
    conversationId: z.string().trim().min(1).max(128).optional(),
    userMessageId: z.string().uuid().optional(),
    assistantMessageId: z.string().uuid().optional(),
    message: z.string().trim().max(4000).default(''),
    attachmentIds: z
      .array(z.string().uuid())
      .max(5)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'Attachment ids must be unique',
      })
      .default([]),
    context: z
      .object({
        organizationId: z.string().trim().min(1).max(128).optional(),
        routePath: z.string().trim().min(1).max(512).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.message.length > 0 || value.attachmentIds.length > 0) return

    ctx.addIssue({
      code: 'custom',
      message: 'Message or attachments are required',
      path: ['message'],
    })
  })

export const assistantAttachmentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).max(512).optional(),
  search: z.string().trim().max(128).optional(),
})

export const assistantRecentAttachmentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
})

export const assistantSyncQuerySchema = z.object({
  after: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(200),
})

export const assistantConversationParamSchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
})

export const assistantActionParamSchema = z.object({
  actionId: z.string().trim().min(1).max(128),
})

export const assistantRunParamSchema = z.object({
  runId: z.string().trim().min(1).max(128),
})

export type AssistantMessageRequest = z.infer<typeof assistantMessageRequestSchema>
export type AssistantAttachmentQuery = z.infer<typeof assistantAttachmentQuerySchema>
export type AssistantSyncQuery = z.infer<typeof assistantSyncQuerySchema>
export type AssistantActionParam = z.infer<typeof assistantActionParamSchema>
export type AssistantRunParam = z.infer<typeof assistantRunParamSchema>
