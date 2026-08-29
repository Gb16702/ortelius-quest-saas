import { desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../infrastructure/database'
import {
  invoice,
  type NewInvoice,
  InvoiceStatus as PersistenceInvoiceStatus,
} from '../../../infrastructure/database/db/schemas/invoice-schema'
import { quote } from '../../../infrastructure/database/db/schemas/quote-schema'
import {
  ERequestLifecycleStatus,
  request,
} from '../../../infrastructure/database/db/schemas/request-schema'
import type {
  CreateInvoiceFromAcceptedQuoteData,
  Invoice,
  InvoiceQuoteSnapshot,
  InvoiceRepository,
  InvoiceRequestSnapshot,
} from '../application/invoice-models'
import { formatInvoiceNumber } from '../domain'

export class DrizzleInvoiceRepository implements InvoiceRepository {
  generateInvoiceNumber(): string {
    return formatInvoiceNumber(Date.now(), nanoid(6))
  }

  generateInvoiceId(): string {
    return nanoid()
  }

  async findQuoteForInvoicing(quoteId: string): Promise<InvoiceQuoteSnapshot | null> {
    const [quoteData] = await db.select().from(quote).where(eq(quote.id, quoteId)).limit(1)
    return quoteData ?? null
  }

  async findRequestForInvoicing(requestId: string): Promise<InvoiceRequestSnapshot | null> {
    const [requestData] = await db
      .select({ id: request.id, lifecycleStatus: request.lifecycleStatus })
      .from(request)
      .where(eq(request.id, requestId))
      .limit(1)

    return requestData ?? null
  }

  async hasInvoiceForQuote(quoteId: string): Promise<boolean> {
    const existingInvoice = await db
      .select({ id: invoice.id })
      .from(invoice)
      .where(eq(invoice.quoteId, quoteId))
      .limit(1)

    return existingInvoice.length > 0
  }

  async createInvoiceFromAcceptedQuote(data: CreateInvoiceFromAcceptedQuoteData): Promise<Invoice> {
    const newInvoice: NewInvoice = {
      id: data.id,
      invoiceNumber: data.invoiceNumber,
      requestId: data.quote.requestId,
      quoteId: data.quote.id,
      organizationId: data.quote.organizationId,
      createdById: data.createdById,
      pricing: data.pricing,
      description: data.description,
      terms: data.terms,
      notes: data.notes,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      status: PersistenceInvoiceStatus.DRAFT,
    }

    return await db.transaction(async (tx) => {
      const [newInvoiceRecord] = await tx.insert(invoice).values(newInvoice).returning()

      await tx
        .update(request)
        .set({
          lifecycleStatus: ERequestLifecycleStatus.INVOICED,
          closedReason: null,
          updatedAt: new Date(),
        })
        .where(eq(request.id, data.quote.requestId))

      return newInvoiceRecord
    })
  }

  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    const [foundInvoice] = await db.select().from(invoice).where(eq(invoice.id, invoiceId)).limit(1)

    return foundInvoice || null
  }

  async getInvoicesByOrganization(organizationId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoice)
      .where(eq(invoice.organizationId, organizationId))
      .orderBy(desc(invoice.createdAt))
  }

  async getInvoicesByRequest(requestId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoice)
      .where(eq(invoice.requestId, requestId))
      .orderBy(desc(invoice.createdAt))
  }

  async markInvoiceSent(invoiceId: string): Promise<Invoice> {
    const [sentInvoice] = await db
      .update(invoice)
      .set({
        status: PersistenceInvoiceStatus.SENT,
        updatedAt: new Date(),
      })
      .where(eq(invoice.id, invoiceId))
      .returning()

    return sentInvoice
  }
}
