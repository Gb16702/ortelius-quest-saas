import {
  assertActiveSubscriptionCustomerId,
  assertCanManageSubscriptionBilling,
  assertSubscriptionInvoiceCustomerId,
  assertSubscriptionInvoiceFound,
  buildEmptySubscriptionInvoiceList,
  buildEnsureSubscriptionCustomerResult,
  type EnsureSubscriptionCustomerResult,
  type SubscriptionInvoiceDetail,
  type SubscriptionInvoiceListResult,
  type SubscriptionPortalSessionResult,
} from '../domain'
import type {
  StripeSubscriptionInvoicePort,
  StripeSubscriptionPortalPort,
  SubscriptionBillingAccessRepositoryPort,
  SubscriptionCustomerRegistryPort,
} from './ports'

export class SubscriptionBillingAccountUseCase {
  constructor(
    private readonly access: SubscriptionBillingAccessRepositoryPort,
    private readonly customers: SubscriptionCustomerRegistryPort,
    private readonly invoices: StripeSubscriptionInvoicePort,
    private readonly portal: StripeSubscriptionPortalPort
  ) {}

  async listInvoices(input: {
    userId: string
    limit: number
    startingAfter?: string
  }): Promise<SubscriptionInvoiceListResult> {
    const membership = await this.access.findMembership(input.userId)
    assertCanManageSubscriptionBilling(membership)

    const customerId = await this.customers.getCustomerId(membership.organizationId)
    if (!customerId) return buildEmptySubscriptionInvoiceList()

    return await this.invoices.listInvoices({
      customerId,
      limit: input.limit,
      startingAfter: input.startingAfter,
    })
  }

  async getInvoice(input: {
    userId: string
    invoiceId: string
  }): Promise<SubscriptionInvoiceDetail> {
    const membership = await this.access.findMembership(input.userId)
    assertCanManageSubscriptionBilling(membership)

    const customerId = await this.customers.getCustomerId(membership.organizationId)
    assertSubscriptionInvoiceCustomerId(customerId)

    const invoice = await this.invoices.retrieveInvoice({
      invoiceId: input.invoiceId,
      customerId,
    })
    assertSubscriptionInvoiceFound(invoice)

    return invoice
  }

  async createPortalSession(input: { userId: string }): Promise<SubscriptionPortalSessionResult> {
    const membership = await this.access.findMembership(input.userId)
    assertCanManageSubscriptionBilling(membership)

    const stripeCustomerId = await this.access.findActiveSubscriptionCustomerId(
      membership.organizationId
    )
    assertActiveSubscriptionCustomerId(stripeCustomerId)

    const organizationSlug = await this.access.findOrganizationSlug(membership.organizationId)

    return await this.portal.createBillingPortalSession({
      customerId: stripeCustomerId,
      organizationSlug,
    })
  }

  async ensureCustomer(input: { userId: string }): Promise<EnsureSubscriptionCustomerResult> {
    const membership = await this.access.findMembership(input.userId)
    assertCanManageSubscriptionBilling(membership)

    const ownerEmail = await this.access.findUserEmail(input.userId)
    const stripeCustomerId = await this.customers.ensureCustomer({
      organizationId: membership.organizationId,
      ownerEmail: ownerEmail ?? undefined,
    })

    return buildEnsureSubscriptionCustomerResult(stripeCustomerId)
  }
}
