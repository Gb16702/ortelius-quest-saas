import { INVOICE_DOMAIN_ERROR_CODES, InvoiceDomainError } from './invoice-errors'

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
} as const

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS]

const SENT_QUOTE_STATUS = 'sent'
const QUOTED_REQUEST_STATUS = 'quoted'

export function assertQuoteCanBeInvoiced(status: string, acceptedByRequester = false): void {
  if (!acceptedByRequester || status !== SENT_QUOTE_STATUS) {
    throw new InvoiceDomainError(
      INVOICE_DOMAIN_ERROR_CODES.QUOTE_NOT_ACCEPTED,
      'Can only create invoice after the quote has been accepted by the requester'
    )
  }
}

export function assertRequestCanBeInvoiced(status: string): void {
  if (status !== QUOTED_REQUEST_STATUS) {
    throw new InvoiceDomainError(
      INVOICE_DOMAIN_ERROR_CODES.REQUEST_NOT_READY,
      'Request must be quoted before an invoice can be created'
    )
  }
}

export function assertNoInvoiceExists(hasExistingInvoice: boolean): void {
  if (hasExistingInvoice) {
    throw new InvoiceDomainError(
      INVOICE_DOMAIN_ERROR_CODES.INVOICE_ALREADY_EXISTS,
      'Invoice already exists for this quote'
    )
  }
}

export function assertCanSendInvoice(status: string): void {
  if (status !== INVOICE_STATUS.DRAFT) {
    throw new InvoiceDomainError(
      INVOICE_DOMAIN_ERROR_CODES.INVALID_STATUS_TRANSITION,
      'Only draft invoices can be sent'
    )
  }
}
