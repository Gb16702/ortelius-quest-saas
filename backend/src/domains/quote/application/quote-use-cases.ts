import type {
  QuoteActivityPort,
  QuoteAuthorizationPort,
  QuoteCreateData,
  QuoteLegalDocumentPort,
  QuoteLegalDocumentsList,
  QuoteLifecycleSideEffectsPort,
  QuoteOrganizationResolverPort,
  QuotePermissionPort,
  QuoteRecord,
  QuoteRepositoryPort,
  QuoteRequestQueryPort,
  QuoteUpdateData,
} from './ports'
import {
  QuoteCreateForbiddenError,
  QuoteLegalDocumentsMismatchError,
  QuoteOrganizationMissingError,
} from './quote-errors'

export class CreateAndSendQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly permissions: QuotePermissionPort,
    private readonly organizations: QuoteOrganizationResolverPort,
    private readonly legalDocuments: QuoteLegalDocumentPort,
    private readonly requests: QuoteRequestQueryPort,
    private readonly activity: QuoteActivityPort,
    private readonly sideEffects: QuoteLifecycleSideEffectsPort
  ) {}

  async execute(command: { data: QuoteCreateData; actorId: string }): Promise<QuoteRecord> {
    const hasPermission = await this.permissions.canCreateQuote(
      command.data.requestId,
      command.actorId
    )
    if (!hasPermission) {
      throw new QuoteCreateForbiddenError()
    }

    const organizationId =
      command.data.organizationId ??
      (await this.organizations.resolveOrganizationIdForUser(command.actorId))
    if (!organizationId) {
      throw new QuoteOrganizationMissingError()
    }

    const requestedDocumentIds = Array.from(new Set(command.data.legalDocumentIds ?? []))
    const legalDocuments = await this.legalDocuments.getActiveByIdsForOrg(
      requestedDocumentIds,
      organizationId
    )
    if (legalDocuments.length !== requestedDocumentIds.length) {
      throw new QuoteLegalDocumentsMismatchError()
    }

    const quote = await this.quotes.createAndSendQuote(
      { ...command.data, organizationId },
      command.actorId,
      legalDocuments
    )

    await this.logActivity('quote-created', quote, command.actorId)
    await this.sideEffects.afterQuoteSent({
      quote,
      actorId: command.actorId,
      totalTTC: Number(command.data.totalTTC ?? 0),
    })
    return quote
  }

  private async logActivity(
    eventType: 'quote-created',
    quote: QuoteRecord,
    actorId: string
  ): Promise<void> {
    if (!quote.organizationId) return

    const request = await this.requests.getRequestById(quote.requestId)
    await this.activity.logQuoteEvent({
      organizationId: quote.organizationId,
      actorId,
      eventType,
      quoteId: quote.id,
      requestId: quote.requestId,
      reqNumber: request?.reqNumber,
    })
  }
}

export class CanCreateQuoteUseCase {
  constructor(private readonly permissions: QuotePermissionPort) {}

  async execute(command: { requestId: string; actorId: string }): Promise<boolean> {
    return await this.permissions.canCreateQuote(command.requestId, command.actorId)
  }
}

export class CheckQuoteAccessUseCase {
  constructor(private readonly authorization: QuoteAuthorizationPort) {}

  async execute(command: { quoteId: string; actorId: string }) {
    return await this.authorization.resolveQuoteAccess(command.quoteId, command.actorId)
  }
}

export class GetQuoteWithLegalDocumentsUseCase {
  constructor(private readonly quotes: QuoteRepositoryPort) {}

  async execute(command: {
    quoteId: string
  }): Promise<QuoteRecord & { legalDocuments: QuoteLegalDocumentsList }> {
    const quote = await this.quotes.getQuoteById(command.quoteId)
    const legalDocuments = await this.quotes.getLegalDocumentsForQuote(command.quoteId)
    return { ...quote, legalDocuments }
  }
}

export class UpdateQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly requests: QuoteRequestQueryPort,
    private readonly activity: QuoteActivityPort
  ) {}

  async execute(command: {
    quoteId: string
    updates: QuoteUpdateData
    actorId: string
  }): Promise<QuoteRecord> {
    const quote = await this.quotes.updateQuote(command.quoteId, command.updates)
    await this.logActivity('quote-updated', quote, command.actorId)
    return quote
  }

  private async logActivity(
    eventType: 'quote-updated',
    quote: QuoteRecord,
    actorId: string
  ): Promise<void> {
    if (!quote.organizationId) return

    const request = await this.requests.getRequestById(quote.requestId)
    await this.activity.logQuoteEvent({
      organizationId: quote.organizationId,
      actorId,
      eventType,
      quoteId: quote.id,
      requestId: quote.requestId,
      reqNumber: request?.reqNumber,
    })
  }
}

export class AcceptQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly requests: QuoteRequestQueryPort,
    private readonly activity: QuoteActivityPort,
    private readonly sideEffects: QuoteLifecycleSideEffectsPort
  ) {}

  async execute(command: { quoteId: string; actorId: string }): Promise<QuoteRecord> {
    const quote = await this.quotes.acceptQuote(command.quoteId, command.actorId)
    await this.logActivity('quote-accepted', quote, command.actorId)
    await this.sideEffects.afterQuoteAccepted({
      quote,
      actorId: command.actorId,
    })
    return quote
  }

  private async logActivity(
    eventType: 'quote-accepted',
    quote: QuoteRecord,
    actorId: string
  ): Promise<void> {
    if (!quote.organizationId) return

    const request = await this.requests.getRequestById(quote.requestId)
    await this.activity.logQuoteEvent({
      organizationId: quote.organizationId,
      actorId,
      eventType,
      quoteId: quote.id,
      requestId: quote.requestId,
      reqNumber: request?.reqNumber,
    })
  }
}

export class RejectQuoteUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly requests: QuoteRequestQueryPort,
    private readonly activity: QuoteActivityPort,
    private readonly sideEffects: QuoteLifecycleSideEffectsPort
  ) {}

  async execute(command: {
    quoteId: string
    rejectionReason: string
    actorId: string
  }): Promise<QuoteRecord> {
    const quote = await this.quotes.rejectQuote(
      command.quoteId,
      command.rejectionReason,
      command.actorId
    )
    await this.logActivity('quote-rejected', quote, command.actorId)
    await this.sideEffects.afterQuoteRejected({
      quote,
      actorId: command.actorId,
      rejectionReason: command.rejectionReason,
    })
    return quote
  }

  private async logActivity(
    eventType: 'quote-rejected',
    quote: QuoteRecord,
    actorId: string
  ): Promise<void> {
    if (!quote.organizationId) return

    const request = await this.requests.getRequestById(quote.requestId)
    await this.activity.logQuoteEvent({
      organizationId: quote.organizationId,
      actorId,
      eventType,
      quoteId: quote.id,
      requestId: quote.requestId,
      reqNumber: request?.reqNumber,
    })
  }
}

export class ListQuotesByRequestUseCase {
  constructor(
    private readonly quotes: QuoteRepositoryPort,
    private readonly authorization: QuoteAuthorizationPort
  ) {}

  async execute(command: {
    requestId: string
    actorId: string
  }): Promise<Array<QuoteRecord & { legalDocuments: QuoteLegalDocumentsList }>> {
    const access = await this.authorization.resolveRequestAccess(command.requestId, command.actorId)
    if (access !== 'allowed') {
      throw new Error('Associated request not found')
    }

    const quotes = await this.quotes.getQuotesByRequest(command.requestId)
    return await this.attachLegalDocuments(quotes)
  }

  private async attachLegalDocuments(
    quotes: QuoteRecord[]
  ): Promise<Array<QuoteRecord & { legalDocuments: QuoteLegalDocumentsList }>> {
    const legalDocsByQuote = await this.quotes.getLegalDocumentsForQuotes(
      quotes.map((quote) => quote.id)
    )
    return quotes.map((quote) => ({
      ...quote,
      legalDocuments: legalDocsByQuote.get(quote.id) ?? [],
    }))
  }
}

export class ListOrganizationQuotesUseCase {
  constructor(private readonly quotes: QuoteRepositoryPort) {}

  async execute(command: {
    organizationId: string
    actorId: string
  }): Promise<Array<QuoteRecord & { legalDocuments: QuoteLegalDocumentsList }>> {
    const quotes = await this.quotes.getOrganizationQuotes(command.organizationId, command.actorId)
    const legalDocsByQuote = await this.quotes.getLegalDocumentsForQuotes(
      quotes.map((quote) => quote.id)
    )
    return quotes.map((quote) => ({
      ...quote,
      legalDocuments: legalDocsByQuote.get(quote.id) ?? [],
    }))
  }
}
