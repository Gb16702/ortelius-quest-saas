export const INVOICE_DOMAIN_ERROR_CODES = {
  QUOTE_NOT_ACCEPTED: 'QUOTE_NOT_ACCEPTED',
  REQUEST_NOT_READY: 'REQUEST_NOT_READY',
  INVOICE_ALREADY_EXISTS: 'INVOICE_ALREADY_EXISTS',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
} as const

export type InvoiceDomainErrorCode =
  (typeof INVOICE_DOMAIN_ERROR_CODES)[keyof typeof INVOICE_DOMAIN_ERROR_CODES]

export class InvoiceDomainError extends Error {
  constructor(
    readonly code: InvoiceDomainErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'InvoiceDomainError'
  }
}
