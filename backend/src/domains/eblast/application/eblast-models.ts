import type { EblastJobStatus } from '../domain'

export type EblastRequest = {
  emails: string[]
  template: string
  templateProps: Record<string, unknown>
  subject: string
  from?: string
}

export type EblastResult = {
  email: string
  success: boolean
  messageId?: string
  error?: string
}

export type EblastJob = {
  id: string
  status: EblastJobStatus
  totalEmails: number
  processed: number
  sent: number
  failed: number
  results: EblastResult[]
  createdAt: Date
  completedAt?: Date
  error?: string
}

export type EblastResponse = {
  success: boolean
  totalSent: number
  totalFailed: number
  results: EblastResult[]
}

export type EblastTemplateOption = {
  name: string
  value: string
}
