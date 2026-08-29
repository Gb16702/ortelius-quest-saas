import {
  assertCanSendInvoice,
  assertNoInvoiceExists,
  assertQuoteCanBeInvoiced,
  assertRequestCanBeInvoiced,
  createInvoicePricingFromQuotePricing,
} from '../domain'
import type { Invoice, InvoiceRepository } from './invoice-models'
import type {
  InvoiceActivityPort,
  InvoiceAuthorizationPort,
  InvoiceLifecycleSideEffectsPort,
  InvoiceOrganizationMembershipPort,
  InvoiceOrganizationRolePort,
  InvoiceRequestLookupPort,
} from './ports'

export class CreateInvoiceFromQuoteUseCase {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly memberships: InvoiceOrganizationMembershipPort,
    private readonly activity: InvoiceActivityPort,
    private readonly requests: InvoiceRequestLookupPort,
    private readonly lifecycleSideEffects: InvoiceLifecycleSideEffectsPort
  ) {}

  async execute(command: {
    quoteId: string
    actorId: string
    dueDate: Date
    description?: string
    terms?: string
    notes?: string
    logActivity?: boolean
    acceptedByRequester?: boolean
  }): Promise<Invoice> {
    const quote = await this.invoices.findQuoteForInvoicing(command.quoteId)
    if (!quote) {
      throw new Error('Quote not found')
    }

    assertQuoteCanBeInvoiced(quote.status, command.acceptedByRequester === true)

    const hasMembership = await this.memberships.hasMembership(
      quote.organizationId,
      command.actorId
    )
    if (!hasMembership) {
      throw new Error('You are not a member of this organization')
    }

    const request = await this.invoices.findRequestForInvoicing(quote.requestId)
    if (!request) {
      throw new Error('Associated request not found')
    }

    assertRequestCanBeInvoiced(request.lifecycleStatus)
    assertNoInvoiceExists(await this.invoices.hasInvoiceForQuote(quote.id))

    const invoice = await this.invoices.createInvoiceFromAcceptedQuote({
      id: this.invoices.generateInvoiceId(),
      invoiceNumber: this.invoices.generateInvoiceNumber(),
      quote,
      createdById: command.actorId,
      pricing: createInvoicePricingFromQuotePricing(quote.pricing),
      description: command.description || quote.description,
      terms: command.terms || quote.terms,
      notes: command.notes,
      issueDate: new Date(),
      dueDate: command.dueDate,
    })

    await this.lifecycleSideEffects.afterInvoiceCreated({ invoice, actorId: command.actorId })

    if (command.logActivity !== false) {
      await this.logCreated(invoice, command.actorId)
    }
    return invoice
  }

  private async logCreated(invoice: Invoice, actorId: string): Promise<void> {
    const reqNumber = await this.requests.getRequestNumber(invoice.requestId)
    await this.activity.logInvoiceCreated({
      organizationId: invoice.organizationId,
      actorId,
      invoiceId: invoice.id,
      requestId: invoice.requestId,
      reqNumber,
    })
  }
}

export class GetInvoiceByIdUseCase {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(command: { invoiceId: string }): Promise<Invoice | null> {
    return await this.invoices.getInvoiceById(command.invoiceId)
  }
}

export class ListOrganizationInvoicesUseCase {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly organizations: InvoiceOrganizationRolePort
  ) {}

  async execute(command: { organizationId: string; actorId: string }): Promise<Invoice[]> {
    const role = await this.organizations.getUserRole(command.organizationId, command.actorId)
    if (!role) {
      throw new Error('You are not a member of this organization')
    }

    return await this.invoices.getInvoicesByOrganization(command.organizationId)
  }
}

export class ListRequestInvoicesUseCase {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly authorization: InvoiceAuthorizationPort,
    private readonly organizations: InvoiceOrganizationRolePort
  ) {}

  async execute(command: { requestId: string; userId: string }): Promise<Invoice[]> {
    const request = await this.authorization.findRequestAccess(command.requestId)
    if (!request) {
      throw new Error('Associated request not found')
    }

    if (request.requesterId !== command.userId) {
      const role = await this.organizations.getUserRole(request.organizationId, command.userId)
      if (!role) {
        throw new Error('Associated request not found')
      }
    }

    return await this.invoices.getInvoicesByRequest(command.requestId)
  }
}

export class SendInvoiceUseCase {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly memberships: InvoiceOrganizationMembershipPort,
    private readonly activity: InvoiceActivityPort,
    private readonly requests: InvoiceRequestLookupPort,
    private readonly lifecycleSideEffects: InvoiceLifecycleSideEffectsPort
  ) {}

  async execute(command: { invoiceId: string; actorId: string }): Promise<Invoice> {
    const existingInvoice = await this.invoices.getInvoiceById(command.invoiceId)
    if (!existingInvoice) {
      throw new Error('Invoice not found')
    }

    const hasMembership = await this.memberships.hasMembership(
      existingInvoice.organizationId,
      command.actorId
    )
    if (!hasMembership) {
      throw new Error('You are not a member of this organization')
    }

    assertCanSendInvoice(existingInvoice.status)

    const invoice = await this.invoices.markInvoiceSent(command.invoiceId)
    await this.lifecycleSideEffects.afterInvoiceSent({ invoice, actorId: command.actorId })
    await this.logSent(invoice, command.actorId)
    return invoice
  }

  private async logSent(invoice: Invoice, actorId: string): Promise<void> {
    const reqNumber = await this.requests.getRequestNumber(invoice.requestId)
    await this.activity.logInvoiceSent({
      organizationId: invoice.organizationId,
      actorId,
      invoiceId: invoice.id,
      requestId: invoice.requestId,
      reqNumber,
    })
  }
}
