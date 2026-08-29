import { CheckInvoiceAccessUseCase } from '../application/invoice-authorization.use-case'
import {
  CreateInvoiceFromQuoteUseCase,
  GetInvoiceByIdUseCase,
  ListOrganizationInvoicesUseCase,
  ListRequestInvoicesUseCase,
  SendInvoiceUseCase,
} from '../application/invoice-use-cases'

export interface InvoiceUseCaseContainer {
  checkAccess: CheckInvoiceAccessUseCase
  createFromQuote: CreateInvoiceFromQuoteUseCase
  getById: GetInvoiceByIdUseCase
  listByOrganization: ListOrganizationInvoicesUseCase
  listByRequest: ListRequestInvoicesUseCase
  send: SendInvoiceUseCase
}

let invoiceUseCases: InvoiceUseCaseContainer | null = null

export async function getInvoiceUseCases(): Promise<InvoiceUseCaseContainer> {
  if (invoiceUseCases) return invoiceUseCases

  const [
    { DrizzleInvoiceAuthorizationAdapter, OrganizationInvoiceRoleAdapter },
    { DrizzleInvoiceRepository },
    { ActivityInvoiceAdapter },
    { RequestsInvoiceLookupAdapter },
    { InvoiceLifecycleSideEffectsAdapter },
  ] = await Promise.all([
    import('./invoice-authorization.adapter'),
    import('./invoice.repository'),
    import('./invoice-activity.adapter'),
    import('./invoice-request-lookup.adapter'),
    import('./invoice-lifecycle-side-effects.adapter'),
  ])

  const invoices = new DrizzleInvoiceRepository()
  const authorization = new DrizzleInvoiceAuthorizationAdapter()
  const organizationRoles = new OrganizationInvoiceRoleAdapter()
  const activity = new ActivityInvoiceAdapter()
  const requests = new RequestsInvoiceLookupAdapter()
  const lifecycleSideEffects = new InvoiceLifecycleSideEffectsAdapter()

  invoiceUseCases = {
    checkAccess: new CheckInvoiceAccessUseCase(authorization, organizationRoles),
    createFromQuote: new CreateInvoiceFromQuoteUseCase(
      invoices,
      organizationRoles,
      activity,
      requests,
      lifecycleSideEffects
    ),
    getById: new GetInvoiceByIdUseCase(invoices),
    listByOrganization: new ListOrganizationInvoicesUseCase(invoices, organizationRoles),
    listByRequest: new ListRequestInvoicesUseCase(invoices, authorization, organizationRoles),
    send: new SendInvoiceUseCase(
      invoices,
      organizationRoles,
      activity,
      requests,
      lifecycleSideEffects
    ),
  }

  return invoiceUseCases
}
