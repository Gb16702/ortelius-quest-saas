import {
  type BillingAddress,
  BillingAddressError,
  type InvoiceEmailState,
  type InvoiceLanguage,
  type InvoiceLanguageState,
  normalizeInvoiceEmail,
  parseInvoiceLanguage,
  resolveBillingName,
  type UpdateBillingAddressInput,
  validateBillingAddress,
} from '../domain'
import type {
  BillingOrganizationPort,
  BillingPreferencesPort,
  SubscriptionActivityPort,
  SubscriptionCustomerRegistryPort,
} from './ports'
import { noopSubscriptionActivity } from './subscription-activity'

export class SubscriptionBillingPreferencesUseCase {
  constructor(
    private readonly customerRegistry: SubscriptionCustomerRegistryPort,
    private readonly billingPreferences: BillingPreferencesPort,
    private readonly organizations: BillingOrganizationPort,
    private readonly activity: SubscriptionActivityPort = noopSubscriptionActivity
  ) {}

  async getInvoiceEmail(command: { organizationId: string }): Promise<InvoiceEmailState> {
    const customerId = await this.customerRegistry.getCustomerId(command.organizationId)
    if (!customerId) return { current: null }

    return {
      current: await this.billingPreferences.getInvoiceEmail(customerId),
    }
  }

  async updateInvoiceEmail(command: {
    organizationId: string
    email: string
    actorId?: string
  }): Promise<{ email: string }> {
    const email = normalizeInvoiceEmail(command.email)
    const customerId = await this.customerRegistry.ensureCustomer({
      organizationId: command.organizationId,
    })
    const updatedEmail = await this.billingPreferences.updateInvoiceEmail(customerId, email)

    const result = { email: updatedEmail ?? email }
    this.logEvent(command, {
      eventType: 'subscription-invoice-email-updated',
      description: 'updated invoice email recipient',
    })

    return result
  }

  async getInvoiceLanguage(command: { organizationId: string }): Promise<InvoiceLanguageState> {
    const customerId = await this.customerRegistry.getCustomerId(command.organizationId)
    if (!customerId) return { current: null }

    return {
      current: await this.billingPreferences.getInvoiceLanguage(customerId),
    }
  }

  async updateInvoiceLanguage(command: {
    organizationId: string
    language: string
    actorId?: string
  }): Promise<{ language: InvoiceLanguage }> {
    const language = parseInvoiceLanguage(command.language)
    const customerId = await this.customerRegistry.ensureCustomer({
      organizationId: command.organizationId,
    })

    await this.billingPreferences.updateInvoiceLanguage(customerId, language)

    const result = { language }
    this.logEvent(command, {
      eventType: 'subscription-invoice-language-updated',
      description: 'updated invoice language',
    })

    return result
  }

  async getBillingAddress(command: { organizationId: string }): Promise<BillingAddress | null> {
    const customerId = await this.customerRegistry.getCustomerId(command.organizationId)
    if (!customerId) return null

    return await this.billingPreferences.getBillingAddress(customerId)
  }

  async updateBillingAddress(
    input: UpdateBillingAddressInput & { actorId?: string }
  ): Promise<BillingAddress> {
    validateBillingAddress(input.address)

    const customerId = await this.customerRegistry.ensureCustomer({
      organizationId: input.organizationId,
    })
    const organizationName = await this.organizations.getOrganizationName(input.organizationId)
    const name = resolveBillingName(input.name, organizationName)
    const saved = await this.billingPreferences.updateBillingAddress({
      customerId,
      address: input.address,
      name,
    })

    if (!saved) {
      throw new BillingAddressError('INVALID_ADDRESS', "Address didn't save correctly.")
    }

    this.logEvent(input, {
      eventType: 'subscription-billing-address-updated',
      description: 'updated billing address',
    })

    return saved
  }

  private logEvent(
    input: { organizationId: string; actorId?: string },
    event: { eventType: string; description: string }
  ): void {
    if (!input.actorId) return

    void this.activity.logEvent({
      organizationId: input.organizationId,
      actorId: input.actorId,
      eventType: event.eventType,
      description: event.description,
    })
  }
}
