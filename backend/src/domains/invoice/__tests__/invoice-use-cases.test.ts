import { describe, expect, it, mock } from 'bun:test'
import type {
  Invoice,
  InvoiceQuoteSnapshot,
  InvoiceRepository,
} from '../application/invoice-models'
import {
  CreateInvoiceFromQuoteUseCase,
  ListOrganizationInvoicesUseCase,
  ListRequestInvoicesUseCase,
  SendInvoiceUseCase,
} from '../application/invoice-use-cases'
import type {
  InvoiceActivityPort,
  InvoiceAuthorizationPort,
  InvoiceLifecycleSideEffectsPort,
  InvoiceOrganizationMembershipPort,
  InvoiceOrganizationRolePort,
  InvoiceRequestLookupPort,
} from '../application/ports'
import { INVOICE_DOMAIN_ERROR_CODES, InvoiceDomainError } from '../domain'

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'invoice-1',
    invoiceNumber: 'INV-1',
    requestId: 'request-1',
    quoteId: 'quote-1',
    organizationId: 'org-1',
    createdById: 'user-1',
    pricing: {
      lines: [],
      subtotal: 100,
      vatPercentage: 20,
      vatAmount: 20,
      totalAmount: 120,
      currency: 'EUR',
    },
    description: null,
    terms: null,
    notes: null,
    issueDate: new Date(),
    dueDate: new Date(),
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeQuote(overrides: Partial<InvoiceQuoteSnapshot> = {}): InvoiceQuoteSnapshot {
  return {
    id: 'quote-1',
    quoteNumber: 'QUO-1',
    requestId: 'request-1',
    organizationId: 'org-1',
    status: 'sent',
    pricing: {
      services: [],
      totalHT: 100,
      vatRate: 20,
      vatAmount: 20,
      totalTTC: 120,
      currency: 'EUR',
    },
    description: 'Quote description',
    terms: 'Quote terms',
    ...overrides,
  }
}

function createRepository(
  invoice = makeInvoice(),
  overrides: Partial<InvoiceRepository> = {}
): InvoiceRepository {
  return {
    createInvoiceFromAcceptedQuote: mock(async () => invoice),
    findQuoteForInvoicing: mock(async () => makeQuote()),
    findRequestForInvoicing: mock(async () => ({ id: 'request-1', lifecycleStatus: 'quoted' })),
    generateInvoiceNumber: mock(() => 'INV-1'),
    generateInvoiceId: mock(() => 'invoice-1'),
    getInvoiceById: mock(async () => invoice),
    getInvoicesByOrganization: mock(async () => [invoice]),
    getInvoicesByRequest: mock(async () => [invoice]),
    hasInvoiceForQuote: mock(async () => false),
    markInvoiceSent: mock(async () => ({ ...invoice, status: 'sent' })),
    ...overrides,
  }
}

function createMemberships(hasMembership = true): InvoiceOrganizationMembershipPort {
  return {
    hasMembership: mock(async () => hasMembership),
  }
}

function createAuthorization(
  requestAccess: Awaited<ReturnType<InvoiceAuthorizationPort['findRequestAccess']>> = {
    organizationId: 'org-1',
    requesterId: 'requester-user',
  }
): InvoiceAuthorizationPort {
  return {
    findInvoiceAccess: mock(async () => ({
      organizationId: 'org-1',
      requestId: 'request-1',
      createdById: 'user-1',
    })),
    findRequestAccess: mock(async () => requestAccess),
    findRequestRequesterId: mock(async () => requestAccess?.requesterId ?? null),
  }
}

function createRoles(role: string | null = 'member'): InvoiceOrganizationRolePort {
  return {
    getUserRole: mock(async () => role),
  }
}

function createActivity(): InvoiceActivityPort {
  return {
    logInvoiceCreated: mock(async () => undefined),
    logInvoiceSent: mock(async () => undefined),
  }
}

function createRequests(): InvoiceRequestLookupPort {
  return {
    getRequestNumber: mock(async () => 'REQ-1'),
  }
}

function createLifecycleSideEffects(): InvoiceLifecycleSideEffectsPort {
  return {
    afterInvoiceCreated: mock(async () => undefined),
    afterInvoiceSent: mock(async () => undefined),
  }
}

describe('Invoice use cases', () => {
  it('creates an invoice and logs activity with request context', async () => {
    const invoices = createRepository()
    const memberships = createMemberships()
    const activity = createActivity()
    const requests = createRequests()
    const lifecycleSideEffects = createLifecycleSideEffects()
    const useCase = new CreateInvoiceFromQuoteUseCase(
      invoices,
      memberships,
      activity,
      requests,
      lifecycleSideEffects
    )

    const invoice = await useCase.execute({
      quoteId: 'quote-1',
      actorId: 'user-1',
      dueDate: new Date('2026-06-01'),
      description: 'Custom',
      acceptedByRequester: true,
    })

    expect(invoice.id).toBe('invoice-1')
    expect(invoices.findQuoteForInvoicing).toHaveBeenCalledWith('quote-1')
    expect(memberships.hasMembership).toHaveBeenCalledWith('org-1', 'user-1')
    expect(invoices.findRequestForInvoicing).toHaveBeenCalledWith('request-1')
    expect(invoices.hasInvoiceForQuote).toHaveBeenCalledWith('quote-1')
    expect(invoices.createInvoiceFromAcceptedQuote).toHaveBeenCalled()
    expect(requests.getRequestNumber).toHaveBeenCalledWith('request-1')
    expect(lifecycleSideEffects.afterInvoiceCreated).toHaveBeenCalledWith({
      invoice,
      actorId: 'user-1',
    })
    expect(activity.logInvoiceCreated).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      invoiceId: 'invoice-1',
      requestId: 'request-1',
      reqNumber: 'REQ-1',
    })
  })

  it('can create an invoice without emitting activity for automatic side effects', async () => {
    const invoices = createRepository(makeInvoice(), {
      findQuoteForInvoicing: mock(async () => makeQuote({ status: 'sent' })),
    })
    const memberships = createMemberships()
    const activity = createActivity()
    const requests = createRequests()
    const lifecycleSideEffects = createLifecycleSideEffects()
    const useCase = new CreateInvoiceFromQuoteUseCase(
      invoices,
      memberships,
      activity,
      requests,
      lifecycleSideEffects
    )

    await useCase.execute({
      quoteId: 'quote-1',
      actorId: 'user-1',
      dueDate: new Date('2026-06-01'),
      logActivity: false,
      acceptedByRequester: true,
    })

    expect(lifecycleSideEffects.afterInvoiceCreated).toHaveBeenCalled()
    expect(activity.logInvoiceCreated).not.toHaveBeenCalled()
    expect(requests.getRequestNumber).not.toHaveBeenCalled()
  })

  it('rejects invoice creation before persistence when quote preconditions fail', async () => {
    const invoices = createRepository(makeInvoice(), {
      findQuoteForInvoicing: mock(async () => makeQuote({ status: 'draft' })),
    })
    const useCase = new CreateInvoiceFromQuoteUseCase(
      invoices,
      createMemberships(),
      createActivity(),
      createRequests(),
      createLifecycleSideEffects()
    )

    await expect(
      useCase.execute({
        quoteId: 'quote-1',
        actorId: 'user-1',
        dueDate: new Date('2026-06-01'),
        acceptedByRequester: true,
      })
    ).rejects.toThrow(InvoiceDomainError)

    expect(invoices.createInvoiceFromAcceptedQuote).not.toHaveBeenCalled()
  })

  it('rejects invoice creation when organization membership is missing', async () => {
    const invoices = createRepository()
    const memberships = createMemberships(false)
    const useCase = new CreateInvoiceFromQuoteUseCase(
      invoices,
      memberships,
      createActivity(),
      createRequests(),
      createLifecycleSideEffects()
    )

    await expect(
      useCase.execute({
        quoteId: 'quote-1',
        actorId: 'user-1',
        dueDate: new Date('2026-06-01'),
        acceptedByRequester: true,
      })
    ).rejects.toThrow('You are not a member of this organization')

    expect(invoices.findRequestForInvoicing).not.toHaveBeenCalled()
    expect(invoices.createInvoiceFromAcceptedQuote).not.toHaveBeenCalled()
  })

  it('rejects invoice creation when one already exists for the quote', async () => {
    const invoices = createRepository(makeInvoice(), {
      hasInvoiceForQuote: mock(async () => true),
    })
    const useCase = new CreateInvoiceFromQuoteUseCase(
      invoices,
      createMemberships(),
      createActivity(),
      createRequests(),
      createLifecycleSideEffects()
    )

    await expect(
      useCase.execute({
        quoteId: 'quote-1',
        actorId: 'user-1',
        dueDate: new Date('2026-06-01'),
        acceptedByRequester: true,
      })
    ).rejects.toMatchObject({
      code: INVOICE_DOMAIN_ERROR_CODES.INVOICE_ALREADY_EXISTS,
    })

    expect(invoices.createInvoiceFromAcceptedQuote).not.toHaveBeenCalled()
  })

  it('sends an invoice and logs activity with request context', async () => {
    const invoices = createRepository()
    const memberships = createMemberships()
    const activity = createActivity()
    const requests = createRequests()
    const lifecycleSideEffects = createLifecycleSideEffects()
    const useCase = new SendInvoiceUseCase(
      invoices,
      memberships,
      activity,
      requests,
      lifecycleSideEffects
    )

    const invoice = await useCase.execute({ invoiceId: 'invoice-1', actorId: 'user-1' })

    expect(invoice.status).toBe('sent')
    expect(invoices.getInvoiceById).toHaveBeenCalledWith('invoice-1')
    expect(memberships.hasMembership).toHaveBeenCalledWith('org-1', 'user-1')
    expect(invoices.markInvoiceSent).toHaveBeenCalledWith('invoice-1')
    expect(lifecycleSideEffects.afterInvoiceSent).toHaveBeenCalledWith({
      invoice,
      actorId: 'user-1',
    })
    expect(activity.logInvoiceSent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      invoiceId: 'invoice-1',
      requestId: 'request-1',
      reqNumber: 'REQ-1',
    })
  })

  it('rejects sending non-draft invoices before persistence', async () => {
    const invoices = createRepository(makeInvoice({ status: 'sent' }))
    const useCase = new SendInvoiceUseCase(
      invoices,
      createMemberships(),
      createActivity(),
      createRequests(),
      createLifecycleSideEffects()
    )

    await expect(
      useCase.execute({ invoiceId: 'invoice-1', actorId: 'user-1' })
    ).rejects.toMatchObject({
      code: INVOICE_DOMAIN_ERROR_CODES.INVALID_STATUS_TRANSITION,
    })

    expect(invoices.markInvoiceSent).not.toHaveBeenCalled()
  })

  it('lists organization invoices for organization members', async () => {
    const invoice = makeInvoice()
    const invoices = createRepository(invoice)
    const roles = createRoles('member')
    const useCase = new ListOrganizationInvoicesUseCase(invoices, roles)

    const result = await useCase.execute({ organizationId: 'org-1', actorId: 'member-user' })

    expect(result).toEqual([invoice])
    expect(roles.getUserRole).toHaveBeenCalledWith('org-1', 'member-user')
    expect(invoices.getInvoicesByOrganization).toHaveBeenCalledWith('org-1')
  })

  it('does not load organization invoices when organization membership is missing', async () => {
    const invoices = createRepository()
    const roles = createRoles(null)
    const useCase = new ListOrganizationInvoicesUseCase(invoices, roles)

    await expect(
      useCase.execute({ organizationId: 'org-1', actorId: 'outside-user' })
    ).rejects.toThrow('You are not a member of this organization')

    expect(roles.getUserRole).toHaveBeenCalledWith('org-1', 'outside-user')
    expect(invoices.getInvoicesByOrganization).not.toHaveBeenCalled()
  })

  it('lists request invoices for the requester without checking organization role', async () => {
    const invoice = makeInvoice()
    const invoices = createRepository(invoice)
    const authorization = createAuthorization({
      organizationId: 'org-1',
      requesterId: 'requester-user',
    })
    const roles = createRoles()
    const useCase = new ListRequestInvoicesUseCase(invoices, authorization, roles)

    const result = await useCase.execute({ requestId: 'request-1', userId: 'requester-user' })

    expect(result).toEqual([invoice])
    expect(authorization.findRequestAccess).toHaveBeenCalledWith('request-1')
    expect(roles.getUserRole).not.toHaveBeenCalled()
    expect(invoices.getInvoicesByRequest).toHaveBeenCalledWith('request-1')
  })

  it('lists request invoices for receiver organization members', async () => {
    const invoices = createRepository()
    const authorization = createAuthorization({
      organizationId: 'org-1',
      requesterId: 'requester-user',
    })
    const roles = createRoles('admin')
    const useCase = new ListRequestInvoicesUseCase(invoices, authorization, roles)

    await useCase.execute({ requestId: 'request-1', userId: 'member-user' })

    expect(roles.getUserRole).toHaveBeenCalledWith('org-1', 'member-user')
    expect(invoices.getInvoicesByRequest).toHaveBeenCalledWith('request-1')
  })

  it('does not load invoices when request invoice access is denied', async () => {
    const invoices = createRepository()
    const authorization = createAuthorization({
      organizationId: 'org-1',
      requesterId: 'requester-user',
    })
    const roles = createRoles(null)
    const useCase = new ListRequestInvoicesUseCase(invoices, authorization, roles)

    await expect(useCase.execute({ requestId: 'request-1', userId: 'other-user' })).rejects.toThrow(
      'Associated request not found'
    )

    expect(invoices.getInvoicesByRequest).not.toHaveBeenCalled()
  })
})
