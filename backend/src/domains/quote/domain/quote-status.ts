export const QUOTE_STATUSES = ['draft', 'sent', 'rejected', 'expired'] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const EDITABLE_QUOTE_STATUSES = ['draft'] as const
export const SENDABLE_QUOTE_STATUSES = ['draft'] as const
export const RESPONDABLE_QUOTE_STATUSES = ['sent'] as const

export function canEditQuote(status: string): boolean {
  return EDITABLE_QUOTE_STATUSES.includes(status as (typeof EDITABLE_QUOTE_STATUSES)[number])
}

export function canSendQuote(quote: {
  status: string
  validUntil: Date | string
  services?: unknown
}): boolean {
  return (
    SENDABLE_QUOTE_STATUSES.includes(quote.status as (typeof SENDABLE_QUOTE_STATUSES)[number]) &&
    new Date(quote.validUntil) > new Date() &&
    Array.isArray(quote.services) &&
    quote.services.length > 0
  )
}

export function canRespondToQuote(quote: { status: string; validUntil: Date | string }): boolean {
  return (
    RESPONDABLE_QUOTE_STATUSES.includes(
      quote.status as (typeof RESPONDABLE_QUOTE_STATUSES)[number]
    ) && new Date(quote.validUntil) > new Date()
  )
}
