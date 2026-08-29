import { z } from 'zod'

export const messageIdParamSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
})

export const conversationIdParamSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
})

export type MessageIdParam = z.infer<typeof messageIdParamSchema>
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>
