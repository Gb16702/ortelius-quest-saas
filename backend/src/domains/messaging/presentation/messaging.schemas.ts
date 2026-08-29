import { z } from 'zod'

export const attachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  originalName: z.string(),
  size: z.number(),
  mimeType: z.string(),
  s3Key: z.string(),
  url: z.string().optional(),
  uploadedAt: z.string(),
  uploadedBy: z.string(),
})

export const mentionSchema = z.object({
  type: z.enum(['user', 'role']),
  id: z.string(),
  name: z.string(),
})

export const messageMetadataSchema = z.object({
  attachments: z.array(attachmentSchema).optional(),
  requestId: z.string().optional(),
  requestNumber: z.string().optional(),
  type: z.string().optional(),
  mentions: z.array(mentionSchema).optional(),
})

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message content is required')
    .max(5000, 'Message too long (max 5000 characters)'),
  messageType: z.string().optional().default('text'),
  replyToId: z.string().optional(),
  metadata: messageMetadataSchema.optional(),
})

export const addReactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required'),
})

export const conversationIdParamSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
})

export const messageIdParamSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
})

export const emojiParamSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required'),
})

export const messagesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 50)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 0)),
})

export const conversationsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 10)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 0)),
  unread: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  search: z
    .string()
    .optional()
    .transform((val) => val?.trim() || undefined),
  type: z.enum(['team', 'member_dm', 'requester']).optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
})

export const resolveConversationSchema = z.object({
  type: z.literal('member_dm'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  targetUserId: z.string().min(1, 'Target user ID is required'),
})

export const messageSearchQuerySchema = z.object({
  q: z
    .string()
    .min(1, 'Search query is required')
    .transform((val) => val?.trim()),
})

export const editMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message content is required')
    .max(5000, 'Message too long (max 5000 characters)'),
})

export type SendMessageData = z.infer<typeof sendMessageSchema>
export type AddReactionData = z.infer<typeof addReactionSchema>
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>
export type MessageIdParam = z.infer<typeof messageIdParamSchema>
export type EmojiParam = z.infer<typeof emojiParamSchema>
export type MessagesQuery = z.infer<typeof messagesQuerySchema>
export type ConversationsQuery = z.infer<typeof conversationsQuerySchema>
export type ResolveConversationData = z.infer<typeof resolveConversationSchema>
export type MessageSearchQuery = z.infer<typeof messageSearchQuerySchema>
export type EditMessageData = z.infer<typeof editMessageSchema>
