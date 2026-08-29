import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../infrastructure/database'
import { member } from '../../../infrastructure/database/db/schemas/auth-schema'
import { quoteLegalDocument } from '../../../infrastructure/database/db/schemas/quote-legal-document-schema'
import {
  EQuoteStatus,
  type IQuotePricing,
  type NewQuote,
  type CreateQuoteData as PersistenceCreateQuoteData,
  type Quote,
  quote,
} from '../../../infrastructure/database/db/schemas/quote-schema'
import {
  ERequestClosedReason,
  ERequestLifecycleStatus,
  request,
} from '../../../infrastructure/database/db/schemas/request-schema'
import { s3Service } from '../../../infrastructure/storage/s3.service'
import type {
  QuoteCreateData,
  QuoteLegalDocumentSnapshot,
  QuoteRecord,
  QuoteRepositoryPort,
  QuoteUpdateData,
} from '../application/ports'
import {
  calculateQuoteTotals,
  canEditQuote,
  canRespondToQuote,
  canSendQuote,
  isSupportedQuoteCurrency,
  type SupportedQuoteCurrency,
} from '../domain'
import type {
  QuoteLegalDocumentItem,
  QuoteLegalDocumentsList,
} from './quote-legal-document-response'
import { quoteLegalDocumentsSchema } from './quote-legal-document-response'

export class DrizzleQuoteRepository implements QuoteRepositoryPort {
  generateQuoteNumber(): string {
    return `QT-${Date.now()}-${nanoid(6)}`
  }

  isValidCurrency(currency: string): currency is SupportedQuoteCurrency {
    return isSupportedQuoteCurrency(currency)
  }

  calculateQuoteTotals(pricing: Partial<IQuotePricing>): IQuotePricing {
    return calculateQuoteTotals(pricing)
  }

  isQuoteReadyToSend(quoteData: Quote): boolean {
    return canSendQuote(quoteData)
  }

  async createQuote(data: PersistenceCreateQuoteData, createdById: string): Promise<Quote> {
    const existingRequest = await db
      .select()
      .from(request)
      .where(
        and(
          eq(request.id, data.requestId),
          eq(request.lifecycleStatus, ERequestLifecycleStatus.QUOTED)
        )
      )
      .limit(1)

    if (existingRequest.length === 0) {
      throw new Error('Request not found or not quoted')
    }

    const assignedToId = existingRequest[0].assignedToId

    let organizationId = data.organizationId
    if (!organizationId) {
      const membership = await db
        .select()
        .from(member)
        .where(eq(member.userId, createdById))
        .limit(1)

      if (membership.length === 0) {
        throw new Error('User not associated with any organization')
      }
      organizationId = membership[0].organizationId
    }

    const membership = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, createdById), eq(member.organizationId, organizationId)))
      .limit(1)

    const role = membership[0]?.role
    const isPrivileged = role === 'admin' || role === 'owner'
    const isAssignedMember = role === 'member' && assignedToId === createdById
    if (membership.length === 0 || (!isPrivileged && !isAssignedMember)) {
      throw new Error('Insufficient permissions to create quote')
    }

    const quoteId = nanoid()
    const quoteNumber = this.generateQuoteNumber()

    const validUntil = data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const newQuote: NewQuote = {
      id: quoteId,
      quoteNumber,
      requestId: data.requestId,
      organizationId,
      createdById,
      cargoTypes: data.selectedCategories,
      services: data.selectedServices,
      cargoDetails: data.cargoDetails,
      pricing: {
        vatRate: data.vatRate,
        totalHT: data.totalHT,
        totalTTC: data.totalTTC,
        vatAmount: data.vatAmount,
        currency: 'EUR',
      },
      description: data.description,
      validUntil,
    }

    const [createdQuote] = await db.insert(quote).values(newQuote).returning()
    return createdQuote
  }

  async createAndSendQuote(
    data: QuoteCreateData,
    createdById: string,
    legalDocuments: QuoteLegalDocumentSnapshot[]
  ): Promise<QuoteRecord> {
    if (legalDocuments.length === 0) {
      throw new Error('At least one legal document is required')
    }
    return db.transaction(async (tx) => {
      const existingRequest = await tx
        .select()
        .from(request)
        .where(
          and(
            eq(request.id, data.requestId),
            eq(request.lifecycleStatus, ERequestLifecycleStatus.OPEN)
          )
        )
        .limit(1)

      if (existingRequest.length === 0) {
        throw new Error('Request not found or not open')
      }

      const assignedToId = existingRequest[0].assignedToId

      let organizationId = data.organizationId
      if (!organizationId) {
        const membership = await tx
          .select()
          .from(member)
          .where(eq(member.userId, createdById))
          .limit(1)

        if (membership.length === 0) {
          throw new Error('User not associated with any organization')
        }
        organizationId = membership[0].organizationId
      }

      const membership = await tx
        .select()
        .from(member)
        .where(and(eq(member.userId, createdById), eq(member.organizationId, organizationId)))
        .limit(1)

      const role = membership[0]?.role
      const isPrivileged = role === 'admin' || role === 'owner'
      const isAssignedMember = role === 'member' && assignedToId === createdById
      if (membership.length === 0 || (!isPrivileged && !isAssignedMember)) {
        throw new Error('Insufficient permissions to create quote')
      }

      const quoteId = nanoid()
      const quoteNumber = this.generateQuoteNumber()
      const validUntil = data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const pricing = {
        vatRate: data.vatRate,
        totalHT: data.totalHT,
        totalTTC: data.totalTTC,
        vatAmount: data.vatAmount,
        currency: 'EUR',
      }

      const newQuote: NewQuote = {
        id: quoteId,
        quoteNumber,
        requestId: data.requestId,
        organizationId,
        createdById,
        cargoTypes: data.selectedCategories,
        services: data.selectedServices,
        cargoDetails: data.cargoDetails,
        pricing,
        description: data.description || null,
        validUntil,
        status: EQuoteStatus.SENT,
      }

      const [createdQuote] = await tx.insert(quote).values(newQuote).returning()

      await tx.insert(quoteLegalDocument).values(
        legalDocuments.map((doc) => ({
          quoteId: createdQuote.id,
          legalDocumentId: doc.id,
          labelSnapshot: doc.label,
          originalFilenameSnapshot: doc.originalFilename,
          sizeBytesSnapshot: doc.sizeBytes,
          s3KeySnapshot: doc.s3Key,
        }))
      )

      await tx
        .update(request)
        .set({ lifecycleStatus: ERequestLifecycleStatus.QUOTED, closedReason: null })
        .where(eq(request.id, data.requestId))

      return createdQuote
    })
  }

  async getQuoteById(quoteId: string): Promise<Quote> {
    const [foundQuote] = await db.select().from(quote).where(eq(quote.id, quoteId)).limit(1)

    if (!foundQuote) {
      throw new Error('Quote not found')
    }

    return foundQuote
  }

  async updateQuote(quoteId: string, updates: QuoteUpdateData): Promise<QuoteRecord> {
    const existingQuote = await this.getQuoteById(quoteId)

    if (!canEditQuote(existingQuote.status as EQuoteStatus)) {
      throw new Error('Can only update draft quotes')
    }

    const finalUpdates: Partial<NewQuote> = { ...updates } as Partial<NewQuote>

    if (updates.pricing) {
      const currentPricing = existingQuote.pricing as IQuotePricing
      finalUpdates.pricing = this.calculateQuoteTotals({
        ...currentPricing,
        ...updates.pricing,
      })
    }

    finalUpdates.version = existingQuote.version + 1

    const [updatedQuote] = await db
      .update(quote)
      .set({ ...finalUpdates, updatedAt: new Date() })
      .where(eq(quote.id, quoteId))
      .returning()

    return updatedQuote
  }

  async acceptQuote(quoteId: string, userId: string): Promise<Quote> {
    const existingQuote = await this.getQuoteById(quoteId)

    const [associatedRequest] = await db
      .select()
      .from(request)
      .where(eq(request.id, existingQuote.requestId))
      .limit(1)

    if (!associatedRequest) {
      throw new Error('Associated request not found')
    }

    if (!associatedRequest.requesterId || associatedRequest.requesterId !== userId) {
      throw new Error('Only the request creator can accept quotes')
    }

    if (!canRespondToQuote(existingQuote)) {
      throw new Error('Quote cannot be accepted in its current state')
    }

    return existingQuote
  }

  async rejectQuote(quoteId: string, rejectionReason: string, userId: string): Promise<Quote> {
    const existingQuote = await this.getQuoteById(quoteId)

    const [associatedRequest] = await db
      .select()
      .from(request)
      .where(eq(request.id, existingQuote.requestId))
      .limit(1)

    if (!associatedRequest) {
      throw new Error('Associated request not found')
    }

    if (!associatedRequest.requesterId || associatedRequest.requesterId !== userId) {
      throw new Error('Only the request creator can reject quotes')
    }

    if (!canRespondToQuote(existingQuote)) {
      throw new Error('Quote cannot be rejected in its current state')
    }

    const rejectedQuote = await db.transaction(async (tx) => {
      const [updatedQuote] = await tx
        .update(quote)
        .set({
          status: EQuoteStatus.REJECTED,
          rejectionReason,
          respondedAt: new Date(),
          respondedById: userId,
          updatedAt: new Date(),
        })
        .where(eq(quote.id, quoteId))
        .returning()

      await tx
        .update(request)
        .set({
          lifecycleStatus: ERequestLifecycleStatus.CLOSED,
          closedReason: ERequestClosedReason.QUOTE_REJECTED,
          updatedAt: new Date(),
        })
        .where(eq(request.id, existingQuote.requestId))

      return updatedQuote
    })

    return rejectedQuote
  }

  async getQuotesByRequest(requestId: string): Promise<Quote[]> {
    const quotes = await db
      .select()
      .from(quote)
      .where(eq(quote.requestId, requestId))
      .orderBy(desc(quote.createdAt))

    return quotes
  }

  async getOrganizationQuotes(organizationId: string, userId: string): Promise<Quote[]> {
    // Verify user is a member of this organization
    const membership = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1)

    if (membership.length === 0) {
      throw new Error('Insufficient permissions to view organization quotes')
    }

    const quotes = await db
      .select()
      .from(quote)
      .where(eq(quote.organizationId, organizationId))
      .orderBy(desc(quote.createdAt))

    return quotes
  }

  async getLegalDocumentsForQuote(quoteId: string): Promise<QuoteLegalDocumentsList> {
    const rows = await db
      .select({
        legalDocumentId: quoteLegalDocument.legalDocumentId,
        labelSnapshot: quoteLegalDocument.labelSnapshot,
        originalFilenameSnapshot: quoteLegalDocument.originalFilenameSnapshot,
        sizeBytesSnapshot: quoteLegalDocument.sizeBytesSnapshot,
        s3KeySnapshot: quoteLegalDocument.s3KeySnapshot,
      })
      .from(quoteLegalDocument)
      .where(eq(quoteLegalDocument.quoteId, quoteId))

    const expiresInSeconds = 60 * 60
    const issuedAt = Date.now()
    const items: QuoteLegalDocumentItem[] = await Promise.all(
      rows.map(async (row) => {
        const url = await s3Service.getDownloadUrl(
          row.s3KeySnapshot,
          expiresInSeconds,
          row.originalFilenameSnapshot
        )
        return {
          id: row.legalDocumentId,
          label: row.labelSnapshot,
          originalFilename: row.originalFilenameSnapshot,
          sizeBytes: row.sizeBytesSnapshot,
          downloadUrl: url,
          downloadUrlExpiresAt: new Date(issuedAt + expiresInSeconds * 1000).toISOString(),
        }
      })
    )

    return quoteLegalDocumentsSchema.parse(items)
  }

  async getLegalDocumentsForQuotes(
    quoteIds: string[]
  ): Promise<Map<string, QuoteLegalDocumentsList>> {
    const result = new Map<string, QuoteLegalDocumentsList>()
    if (quoteIds.length === 0) {
      return result
    }
    const lists = await Promise.all(
      quoteIds.map(async (id) => [id, await this.getLegalDocumentsForQuote(id)] as const)
    )
    for (const [id, list] of lists) {
      result.set(id, list)
    }
    return result
  }

  async expireQuote(quoteId: string): Promise<Quote> {
    const existingQuote = await this.getQuoteById(quoteId)

    if (existingQuote.status !== EQuoteStatus.SENT) {
      throw new Error('Only sent quotes can be expired')
    }

    const [expiredQuote] = await db
      .update(quote)
      .set({
        status: EQuoteStatus.EXPIRED,
        updatedAt: new Date(),
      })
      .where(eq(quote.id, quoteId))
      .returning()

    return expiredQuote
  }
}
