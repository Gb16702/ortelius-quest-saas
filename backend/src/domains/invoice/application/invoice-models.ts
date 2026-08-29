import type {
  InvoiceLine as DomainInvoiceLine,
  InvoicePricing as DomainInvoicePricing,
  QuotePricingForInvoice,
} from '../domain'
import { INVOICE_STATUS } from '../domain'

export const InvoiceStatus = INVOICE_STATUS
export type InvoiceStatus = string
export type InvoiceLine = DomainInvoiceLine
export type InvoicePricing = DomainInvoicePricing

export interface Invoice {
  id: string
  invoiceNumber: string
  requestId: string
  quoteId: string
  organizationId: string
  createdById: string
  pricing: InvoicePricing
  description?: string | null
  terms?: string | null
  notes?: string | null
  issueDate: Date
  dueDate: Date
  status: InvoiceStatus
  updatedAt: Date
  createdAt: Date
}

export interface CreateInvoiceRequest {
  quoteId: string
  dueDate: string
  description?: string
  terms?: string
  notes?: string
}

export interface InvoiceWithDetails extends Invoice {
  organization?: {
    id: string
    name: string
    slug: string
  }
  request?: {
    id: string
    reqNumber: string
  }
  quote?: {
    id: string
    quoteNumber: string
  }
}

export type InvoiceQuoteSnapshot = {
  id: string
  quoteNumber: string
  requestId: string
  organizationId: string
  status: string
  pricing: QuotePricingForInvoice
  description?: string | null
  terms?: string | null
}

export type InvoiceRequestSnapshot = {
  id: string
  lifecycleStatus: string
}

export type CreateInvoiceFromAcceptedQuoteData = {
  id: string
  invoiceNumber: string
  quote: InvoiceQuoteSnapshot
  createdById: string
  pricing: InvoicePricing
  description?: string | null
  terms?: string | null
  notes?: string
  issueDate: Date
  dueDate: Date
}

export interface InvoiceRepository {
  generateInvoiceNumber(): string
  generateInvoiceId(): string
  findQuoteForInvoicing(quoteId: string): Promise<InvoiceQuoteSnapshot | null>
  findRequestForInvoicing(requestId: string): Promise<InvoiceRequestSnapshot | null>
  hasInvoiceForQuote(quoteId: string): Promise<boolean>
  createInvoiceFromAcceptedQuote(data: CreateInvoiceFromAcceptedQuoteData): Promise<Invoice>
  getInvoiceById(invoiceId: string): Promise<Invoice | null>
  getInvoicesByOrganization(organizationId: string): Promise<Invoice[]>
  getInvoicesByRequest(requestId: string): Promise<Invoice[]>
  markInvoiceSent(invoiceId: string): Promise<Invoice>
}
