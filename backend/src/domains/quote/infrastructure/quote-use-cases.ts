import {
  AcceptQuoteUseCase,
  CanCreateQuoteUseCase,
  CheckQuoteAccessUseCase,
  CreateAndSendQuoteUseCase,
  GetQuoteWithLegalDocumentsUseCase,
  ListOrganizationQuotesUseCase,
  ListQuotesByRequestUseCase,
  RejectQuoteUseCase,
  UpdateQuoteUseCase,
} from '../application/quote-use-cases'

export interface QuoteUseCaseContainer {
  createAndSend: CreateAndSendQuoteUseCase
  getWithLegalDocuments: GetQuoteWithLegalDocumentsUseCase
  update: UpdateQuoteUseCase
  accept: AcceptQuoteUseCase
  reject: RejectQuoteUseCase
  listByRequest: ListQuotesByRequestUseCase
  listByOrganization: ListOrganizationQuotesUseCase
  canCreate: CanCreateQuoteUseCase
  checkAccess: CheckQuoteAccessUseCase
}

let quoteUseCases: QuoteUseCaseContainer | null = null

export async function getQuoteUseCases(): Promise<QuoteUseCaseContainer> {
  if (quoteUseCases) return quoteUseCases

  const [
    { QuoteActivityAdapter },
    { QuoteAuthorizationAdapter },
    { QuoteLegalDocumentAdapter },
    { QuoteLifecycleSideEffectsAdapter },
    { QuoteOrganizationResolverAdapter },
    { QuotePermissionAdapter },
    { QuoteRequestQueryAdapter },
    { DrizzleQuoteRepository },
  ] = await Promise.all([
    import('./quote-activity.adapter'),
    import('./quote-authorization.adapter'),
    import('./quote-legal-document.adapter'),
    import('./quote-lifecycle-side-effects.adapter'),
    import('./quote-organization-resolver.adapter'),
    import('./quote-permission.adapter'),
    import('./quote-request-query.adapter'),
    import('./quote.repository'),
  ])

  const quotes = new DrizzleQuoteRepository()
  const activity = new QuoteActivityAdapter()
  const authorization = new QuoteAuthorizationAdapter()
  const legalDocuments = new QuoteLegalDocumentAdapter()
  const sideEffects = new QuoteLifecycleSideEffectsAdapter()
  const organizations = new QuoteOrganizationResolverAdapter()
  const permissions = new QuotePermissionAdapter()
  const requests = new QuoteRequestQueryAdapter()

  quoteUseCases = {
    createAndSend: new CreateAndSendQuoteUseCase(
      quotes,
      permissions,
      organizations,
      legalDocuments,
      requests,
      activity,
      sideEffects
    ),
    getWithLegalDocuments: new GetQuoteWithLegalDocumentsUseCase(quotes),
    update: new UpdateQuoteUseCase(quotes, requests, activity),
    accept: new AcceptQuoteUseCase(quotes, requests, activity, sideEffects),
    reject: new RejectQuoteUseCase(quotes, requests, activity, sideEffects),
    listByRequest: new ListQuotesByRequestUseCase(quotes, authorization),
    listByOrganization: new ListOrganizationQuotesUseCase(quotes),
    canCreate: new CanCreateQuoteUseCase(permissions),
    checkAccess: new CheckQuoteAccessUseCase(authorization),
  }

  return quoteUseCases
}
