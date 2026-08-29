import { describe, expect, it, mock } from 'bun:test'
import type {
  StripeSubscriptionInvoicePort,
  StripeSubscriptionPortalPort,
  SubscriptionBillingAccessRepositoryPort,
  SubscriptionCustomerRegistryPort,
} from '../application/ports'
import { SubscriptionBillingAccountUseCase } from '../application/subscription-billing-account.use-cases'
import {
  SubscriptionBillingAccountError,
  type SubscriptionBillingMembership,
  type SubscriptionInvoiceDetail,
  type SubscriptionInvoiceListResult,
} from '../domain'

function createMembership(
  overrides: Partial<SubscriptionBillingMembership> = {}
): SubscriptionBillingMembership {
  return {
    organizationId: 'org-1',
    role: 'admin',
    ...overrides,
  }
}

function createInvoiceList(): SubscriptionInvoiceListResult {
  return {
    invoices: [
      {
        id: 'in_1',
        number: 'INV-001',
        status: 'paid',
        currency: 'eur',
        amountDue: 0,
        amountPaid: 4900,
        hostedInvoiceUrl: 'https://stripe.test/invoice',
        invoicePdf: 'https://stripe.test/invoice.pdf',
        periodStart: 1772323200,
        periodEnd: 1775001600,
        created: 1772323200,
      },
    ],
    hasMore: false,
  }
}

function createInvoiceDetail(): SubscriptionInvoiceDetail {
  return {
    ...createInvoiceList().invoices[0],
    subtotal: 4900,
    total: 4900,
    paidAt: 1772323300,
    tax: null,
    paymentMethod: null,
    customer: null,
    account: null,
    discount: null,
    lineItems: [],
  }
}

function createAccessRepository(
  input: {
    membership?: SubscriptionBillingMembership | null
    ownerEmail?: string | null
    activeCustomerId?: string | null
    organizationSlug?: string | null
  } = {}
): SubscriptionBillingAccessRepositoryPort {
  return {
    findMembership: mock(async () =>
      input.membership === undefined ? createMembership() : input.membership
    ),
    findMembershipInOrganization: mock(async () =>
      input.membership === undefined ? createMembership() : input.membership
    ),
    findUserEmail: mock(async () =>
      input.ownerEmail === undefined ? 'owner@example.com' : input.ownerEmail
    ),
    findActiveSubscriptionCustomerId: mock(async () =>
      input.activeCustomerId === undefined ? 'cus-active' : input.activeCustomerId
    ),
    findOrganizationSlug: mock(async () =>
      input.organizationSlug === undefined ? 'acme' : input.organizationSlug
    ),
  }
}

function createCustomerRegistry(
  input: { customerId?: string | null; ensureError?: Error } = {}
): SubscriptionCustomerRegistryPort {
  return {
    getCustomerId: mock(async () => (input.customerId === undefined ? 'cus-1' : input.customerId)),
    ensureCustomer: mock(async () => {
      if (input.ensureError) throw input.ensureError
      return input.customerId ?? 'cus-1'
    }),
  }
}

function createInvoices(
  input: { list?: SubscriptionInvoiceListResult; invoice?: SubscriptionInvoiceDetail | null } = {}
): StripeSubscriptionInvoicePort {
  return {
    listInvoices: mock(async () => input.list ?? createInvoiceList()),
    retrieveInvoice: mock(async () =>
      input.invoice === undefined ? createInvoiceDetail() : input.invoice
    ),
  }
}

function createPortal(): StripeSubscriptionPortalPort {
  return {
    createBillingPortalSession: mock(async () => ({ url: 'https://billing.stripe.test/session' })),
  }
}

function createUseCase(
  input: {
    access?: SubscriptionBillingAccessRepositoryPort
    customers?: SubscriptionCustomerRegistryPort
    invoices?: StripeSubscriptionInvoicePort
    portal?: StripeSubscriptionPortalPort
  } = {}
) {
  const access = input.access ?? createAccessRepository()
  const customers = input.customers ?? createCustomerRegistry()
  const invoices = input.invoices ?? createInvoices()
  const portal = input.portal ?? createPortal()

  return {
    access,
    customers,
    invoices,
    portal,
    useCase: new SubscriptionBillingAccountUseCase(access, customers, invoices, portal),
  }
}

describe('Subscription billing account use case', () => {
  it('returns an empty invoice list without calling Stripe when no customer exists', async () => {
    const { invoices, useCase } = createUseCase({
      customers: createCustomerRegistry({ customerId: null }),
    })

    const result = await useCase.listInvoices({ userId: 'user-1', limit: 24 })

    expect(result).toEqual({ invoices: [], hasMore: false })
    expect(invoices.listInvoices).not.toHaveBeenCalled()
  })

  it('rejects billing account access for non-admin members', async () => {
    const { customers, useCase } = createUseCase({
      access: createAccessRepository({ membership: createMembership({ role: 'member' }) }),
    })

    await expect(useCase.listInvoices({ userId: 'user-1', limit: 24 })).rejects.toThrow(
      SubscriptionBillingAccountError
    )
    expect(customers.getCustomerId).not.toHaveBeenCalled()
  })

  it('loads invoice lists for the organization customer', async () => {
    const { invoices, useCase } = createUseCase()

    const result = await useCase.listInvoices({
      userId: 'user-1',
      limit: 10,
      startingAfter: 'in_prev',
    })

    expect(result).toEqual(createInvoiceList())
    expect(invoices.listInvoices).toHaveBeenCalledWith({
      customerId: 'cus-1',
      limit: 10,
      startingAfter: 'in_prev',
    })
  })

  it('hides invoice detail when the organization has no customer or Stripe rejects ownership', async () => {
    const { useCase: noCustomerUseCase } = createUseCase({
      customers: createCustomerRegistry({ customerId: null }),
    })
    const { useCase: wrongCustomerUseCase } = createUseCase({
      invoices: createInvoices({ invoice: null }),
    })

    await expect(
      noCustomerUseCase.getInvoice({ userId: 'user-1', invoiceId: 'in_1' })
    ).rejects.toThrow(SubscriptionBillingAccountError)
    await expect(
      wrongCustomerUseCase.getInvoice({ userId: 'user-1', invoiceId: 'in_1' })
    ).rejects.toThrow(SubscriptionBillingAccountError)
  })

  it('creates portal sessions from the active subscription customer and organization slug', async () => {
    const { portal, useCase } = createUseCase({
      access: createAccessRepository({
        activeCustomerId: 'cus-active',
        organizationSlug: 'quest',
      }),
    })

    const result = await useCase.createPortalSession({ userId: 'user-1' })

    expect(result).toEqual({ url: 'https://billing.stripe.test/session' })
    expect(portal.createBillingPortalSession).toHaveBeenCalledWith({
      customerId: 'cus-active',
      organizationSlug: 'quest',
    })
  })

  it('ensures customers with the authenticated owner email', async () => {
    const { customers, useCase } = createUseCase({
      access: createAccessRepository({ ownerEmail: 'owner@acme.test' }),
    })

    const result = await useCase.ensureCustomer({ userId: 'user-1' })

    expect(result).toEqual({ stripeCustomerId: 'cus-1' })
    expect(customers.ensureCustomer).toHaveBeenCalledWith({
      organizationId: 'org-1',
      ownerEmail: 'owner@acme.test',
    })
  })
})
