import { describe, expect, it, mock } from 'bun:test'
import type {
  QuoteActivityPort,
  QuoteAuthorizationPort,
  QuoteCreateData,
  QuoteLegalDocumentDownload,
  QuoteLegalDocumentPort,
  QuoteLifecycleSideEffectsPort,
  QuoteOrganizationResolverPort,
  QuotePermissionPort,
  QuoteRecord,
  QuoteRepositoryPort,
  QuoteRequestQueryPort,
} from '../application/ports'
import { QuoteCreateForbiddenError } from '../application/quote-errors'
import {
  AcceptQuoteUseCase,
  CreateAndSendQuoteUseCase,
  ListQuotesByRequestUseCase,
  RejectQuoteUseCase,
  UpdateQuoteUseCase,
} from '../application/quote-use-cases'

function makeQuote(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  return {
    id: 'quote-1',
    quoteNumber: 'QT-1',
    requestId: 'request-1',
    organizationId: 'org-1',
    ...overrides,
  }
}

function makeQuoteCreateData(overrides: Partial<QuoteCreateData> = {}): QuoteCreateData {
  return {
    requestId: 'request-1',
    selectedCategories: ['general'],
    selectedServices: [{ serviceId: 'service-1', included: true, price: 1000 }],
    cargoDetails: {
      weight: null,
      volume: null,
      palletCount: null,
      fragility: null,
      dimensions: { length: null, width: null, height: null },
      options: { hazardous: false, insuranceCoverage: false, perishableGoods: false },
    },
    vatRate: 20,
    totalHT: 1000,
    totalTTC: 1200,
    vatAmount: 200,
    legalDocumentIds: ['doc-1'],
    ...overrides,
  }
}

function makeLegalDocumentDownload(overrides: Partial<QuoteLegalDocumentDownload> = {}) {
  return {
    id: 'doc-1',
    label: 'Document 1',
    originalFilename: 'document-1.pdf',
    sizeBytes: 100,
    downloadUrl: 'https://example.com/document-1.pdf',
    downloadUrlExpiresAt: new Date().toISOString(),
    ...overrides,
  }
}

function createRepository(): QuoteRepositoryPort {
  return {
    createAndSendQuote: mock(async () => makeQuote()),
    getQuoteById: mock(async () => makeQuote()),
    updateQuote: mock(async () => makeQuote()),
    acceptQuote: mock(async () => makeQuote()),
    rejectQuote: mock(async () => makeQuote()),
    getQuotesByRequest: mock(async () => [makeQuote()]),
    getOrganizationQuotes: mock(async () => [makeQuote()]),
    getLegalDocumentsForQuote: mock(async () => [makeLegalDocumentDownload()]),
    getLegalDocumentsForQuotes: mock(
      async () => new Map([['quote-1', [makeLegalDocumentDownload()]]])
    ),
  }
}

function createPermissions(canCreate = true): QuotePermissionPort {
  return {
    canCreateQuote: mock(async () => canCreate),
  }
}

function createAuthorization(
  access: 'allowed' | 'not_found' | 'forbidden' = 'allowed'
): QuoteAuthorizationPort {
  return {
    resolveQuoteAccess: mock(async () => access),
    resolveRequestAccess: mock(async () => access),
  }
}

function createOrganizations(
  organizationId: string | null = 'org-1'
): QuoteOrganizationResolverPort {
  return {
    resolveOrganizationIdForUser: mock(async () => organizationId),
  }
}

function createLegalDocuments(count = 1): QuoteLegalDocumentPort {
  return {
    getActiveByIdsForOrg: mock(async () =>
      Array.from({ length: count }, (_, index) => ({
        id: `doc-${index + 1}`,
        label: `Document ${index + 1}`,
        originalFilename: `document-${index + 1}.pdf`,
        sizeBytes: 100,
        s3Key: `legal/doc-${index + 1}.pdf`,
      }))
    ),
  }
}

function createRequests(): QuoteRequestQueryPort {
  return {
    getRequestById: mock(async () => ({ id: 'request-1', reqNumber: 'REQ-1' })),
  }
}

function createActivity(): QuoteActivityPort {
  return {
    logQuoteEvent: mock(async () => undefined),
  }
}

function createSideEffects(): QuoteLifecycleSideEffectsPort {
  return {
    afterQuoteSent: mock(async () => undefined),
    afterQuoteAccepted: mock(async () => undefined),
    afterQuoteRejected: mock(async () => undefined),
  }
}

describe('Quote use cases', () => {
  it('creates and sends a quote with permission, legal documents, and activity ports', async () => {
    const repository = createRepository()
    const permissions = createPermissions()
    const organizations = createOrganizations()
    const legalDocuments = createLegalDocuments(1)
    const requests = createRequests()
    const activity = createActivity()
    const sideEffects = createSideEffects()
    const useCase = new CreateAndSendQuoteUseCase(
      repository,
      permissions,
      organizations,
      legalDocuments,
      requests,
      activity,
      sideEffects
    )

    const quote = await useCase.execute({
      actorId: 'user-1',
      data: makeQuoteCreateData({ legalDocumentIds: ['doc-1', 'doc-1'] }),
    })

    expect(quote.id).toBe('quote-1')
    expect(permissions.canCreateQuote).toHaveBeenCalledWith('request-1', 'user-1')
    expect(organizations.resolveOrganizationIdForUser).toHaveBeenCalledWith('user-1')
    expect(legalDocuments.getActiveByIdsForOrg).toHaveBeenCalledWith(['doc-1'], 'org-1')
    expect(repository.createAndSendQuote).toHaveBeenCalledWith(
      {
        ...makeQuoteCreateData({ legalDocumentIds: ['doc-1', 'doc-1'] }),
        organizationId: 'org-1',
      },
      'user-1',
      [expect.objectContaining({ id: 'doc-1' })]
    )
    expect(activity.logQuoteEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'quote-created',
      quoteId: 'quote-1',
      requestId: 'request-1',
      reqNumber: 'REQ-1',
    })
    expect(sideEffects.afterQuoteSent).toHaveBeenCalledWith({
      quote: expect.objectContaining({ id: 'quote-1' }),
      actorId: 'user-1',
      totalTTC: 1200,
    })
  })

  it('rejects quote creation before loading legal documents when permission fails', async () => {
    const repository = createRepository()
    const legalDocuments = createLegalDocuments()
    const useCase = new CreateAndSendQuoteUseCase(
      repository,
      createPermissions(false),
      createOrganizations(),
      legalDocuments,
      createRequests(),
      createActivity(),
      createSideEffects()
    )

    await expect(
      useCase.execute({
        actorId: 'user-1',
        data: makeQuoteCreateData(),
      })
    ).rejects.toThrow(QuoteCreateForbiddenError)

    expect(legalDocuments.getActiveByIdsForOrg).not.toHaveBeenCalled()
    expect(repository.createAndSendQuote).not.toHaveBeenCalled()
  })

  it('updates a quote and logs activity from the application layer', async () => {
    const repository = createRepository()
    const activity = createActivity()
    const useCase = new UpdateQuoteUseCase(repository, createRequests(), activity)

    await useCase.execute({
      quoteId: 'quote-1',
      updates: { description: 'Updated' },
      actorId: 'user-1',
    })

    expect(repository.updateQuote).toHaveBeenCalledWith('quote-1', { description: 'Updated' })
    expect(activity.logQuoteEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'quote-updated',
        quoteId: 'quote-1',
        requestId: 'request-1',
      })
    )
  })

  it('accepts a quote and runs lifecycle side effects from the application layer', async () => {
    const repository = createRepository()
    const sideEffects = createSideEffects()
    const useCase = new AcceptQuoteUseCase(
      repository,
      createRequests(),
      createActivity(),
      sideEffects
    )

    await useCase.execute({ quoteId: 'quote-1', actorId: 'user-1' })

    expect(repository.acceptQuote).toHaveBeenCalledWith('quote-1', 'user-1')
    expect(sideEffects.afterQuoteAccepted).toHaveBeenCalledWith({
      quote: expect.objectContaining({ id: 'quote-1' }),
      actorId: 'user-1',
    })
  })

  it('rejects a quote and runs lifecycle side effects from the application layer', async () => {
    const repository = createRepository()
    const sideEffects = createSideEffects()
    const useCase = new RejectQuoteUseCase(
      repository,
      createRequests(),
      createActivity(),
      sideEffects
    )

    await useCase.execute({
      quoteId: 'quote-1',
      rejectionReason: 'Too expensive',
      actorId: 'user-1',
    })

    expect(repository.rejectQuote).toHaveBeenCalledWith('quote-1', 'Too expensive', 'user-1')
    expect(sideEffects.afterQuoteRejected).toHaveBeenCalledWith({
      quote: expect.objectContaining({ id: 'quote-1' }),
      actorId: 'user-1',
      rejectionReason: 'Too expensive',
    })
  })

  it('lists quotes by request with attached legal documents', async () => {
    const repository = createRepository()
    const authorization = createAuthorization()
    const useCase = new ListQuotesByRequestUseCase(repository, authorization)

    const quotes = await useCase.execute({ requestId: 'request-1', actorId: 'requester-user' })

    expect(authorization.resolveRequestAccess).toHaveBeenCalledWith('request-1', 'requester-user')
    expect(repository.getQuotesByRequest).toHaveBeenCalledWith('request-1')
    expect(repository.getLegalDocumentsForQuotes).toHaveBeenCalledWith(['quote-1'])
    expect(quotes).toEqual([
      expect.objectContaining({
        id: 'quote-1',
        legalDocuments: [makeLegalDocumentDownload()],
      }),
    ])
  })

  it('does not load quotes or legal documents when request access is denied', async () => {
    const repository = createRepository()
    const authorization = createAuthorization('forbidden')
    const useCase = new ListQuotesByRequestUseCase(repository, authorization)

    await expect(
      useCase.execute({ requestId: 'request-1', actorId: 'other-user' })
    ).rejects.toThrow('Associated request not found')

    expect(repository.getQuotesByRequest).not.toHaveBeenCalled()
    expect(repository.getLegalDocumentsForQuotes).not.toHaveBeenCalled()
  })
})
