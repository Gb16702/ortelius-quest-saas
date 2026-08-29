import type { ContactEmailContent, ContactMessageInput } from '../domain'

export interface ContactFormData extends ContactMessageInput {}

export type { ContactEmailContent }

export interface ContactSendResult {
  success: true
  messageId: string
}
