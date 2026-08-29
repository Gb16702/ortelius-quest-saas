import { describe, expect, it, mock } from 'bun:test'
import type {
  BillingOrganizationPort,
  BillingPreferencesPort,
  SubscriptionActivityPort,
  SubscriptionCustomerRegistryPort,
} from '../application/ports'
import { SubscriptionBillingPreferencesUseCase } from '../application/subscription-billing-preferences.use-cases'
import {
  type BillingAddress,
  BillingAddressError,
  InvoiceEmailError,
  InvoiceLanguageError,
} from '../domain'

function createCustomerRegistry(
  input: { customerId?: string | null } = {}
): SubscriptionCustomerRegistryPort {
  return {
    getCustomerId: mock(async () => (input.customerId === undefined ? 'cus-1' : input.customerId)),
    ensureCustomer: mock(async () => input.customerId ?? 'cus-1'),
  }
}

function createBillingPreferences(
  input: {
    email?: string | null
    language?: 'en' | 'fr' | 'nl' | 'es' | null
    address?: BillingAddress | null
  } = {}
): BillingPreferencesPort {
  return {
    getInvoiceEmail: mock(async () => input.email ?? 'billing@example.com'),
    updateInvoiceEmail: mock(async (_customerId, email) => email),
    getInvoiceLanguage: mock(async () => input.language ?? 'fr'),
    updateInvoiceLanguage: mock(async () => undefined),
    getBillingAddress: mock(async () => input.address ?? createAddress()),
    updateBillingAddress: mock(async ({ address }) => address),
  }
}

function createOrganizations(input: { name?: string | null } = {}): BillingOrganizationPort {
  return {
    getOrganizationName: mock(async () => (input.name === undefined ? 'Acme' : input.name)),
  }
}

function createAddress(overrides: Partial<BillingAddress> = {}): BillingAddress {
  return {
    country: 'BE',
    line1: 'Rue Neuve 1',
    line2: null,
    city: 'Brussels',
    postalCode: '1000',
    state: null,
    ...overrides,
  }
}

function createActivity(): SubscriptionActivityPort {
  return {
    logEvent: mock(async () => undefined),
  }
}

function createUseCase(
  input: {
    customerRegistry?: SubscriptionCustomerRegistryPort
    billingPreferences?: BillingPreferencesPort
    organizations?: BillingOrganizationPort
    activity?: SubscriptionActivityPort
  } = {}
) {
  const customerRegistry = input.customerRegistry ?? createCustomerRegistry()
  const billingPreferences = input.billingPreferences ?? createBillingPreferences()
  const organizations = input.organizations ?? createOrganizations()
  const activity = input.activity ?? createActivity()

  return {
    customerRegistry,
    billingPreferences,
    organizations,
    activity,
    useCase: new SubscriptionBillingPreferencesUseCase(
      customerRegistry,
      billingPreferences,
      organizations,
      activity
    ),
  }
}

describe('Subscription billing preferences use case', () => {
  it('does not create a Stripe customer when reading a missing invoice email', async () => {
    const { customerRegistry, billingPreferences, useCase } = createUseCase({
      customerRegistry: createCustomerRegistry({ customerId: null }),
    })

    const result = await useCase.getInvoiceEmail({ organizationId: 'org-1' })

    expect(result).toEqual({ current: null })
    expect(customerRegistry.ensureCustomer).not.toHaveBeenCalled()
    expect(billingPreferences.getInvoiceEmail).not.toHaveBeenCalled()
  })

  it('normalizes invoice email before ensuring and updating the Stripe customer', async () => {
    const activity = createActivity()
    const { customerRegistry, billingPreferences, useCase } = createUseCase({ activity })

    const result = await useCase.updateInvoiceEmail({
      organizationId: 'org-1',
      email: '  billing@example.com  ',
      actorId: 'user-1',
    })

    expect(result).toEqual({ email: 'billing@example.com' })
    expect(customerRegistry.ensureCustomer).toHaveBeenCalledWith({ organizationId: 'org-1' })
    expect(billingPreferences.updateInvoiceEmail).toHaveBeenCalledWith(
      'cus-1',
      'billing@example.com'
    )
    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-invoice-email-updated',
      description: 'updated invoice email recipient',
    })
  })

  it('rejects invalid invoice emails before ensuring a Stripe customer', async () => {
    const { customerRegistry, useCase } = createUseCase()

    await expect(
      useCase.updateInvoiceEmail({
        organizationId: 'org-1',
        email: 'bad-email',
      })
    ).rejects.toThrow(InvoiceEmailError)

    expect(customerRegistry.ensureCustomer).not.toHaveBeenCalled()
  })

  it('reads and updates supported invoice language values', async () => {
    const activity = createActivity()
    const { billingPreferences, useCase } = createUseCase({ activity })

    await expect(useCase.getInvoiceLanguage({ organizationId: 'org-1' })).resolves.toEqual({
      current: 'fr',
    })
    await expect(
      useCase.updateInvoiceLanguage({
        organizationId: 'org-1',
        language: 'nl',
        actorId: 'user-1',
      })
    ).resolves.toEqual({ language: 'nl' })
    expect(billingPreferences.updateInvoiceLanguage).toHaveBeenCalledWith('cus-1', 'nl')
    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-invoice-language-updated',
      description: 'updated invoice language',
    })
  })

  it('rejects unsupported invoice languages before ensuring a Stripe customer', async () => {
    const { customerRegistry, useCase } = createUseCase()

    await expect(
      useCase.updateInvoiceLanguage({
        organizationId: 'org-1',
        language: 'de',
      })
    ).rejects.toThrow(InvoiceLanguageError)

    expect(customerRegistry.ensureCustomer).not.toHaveBeenCalled()
  })

  it('uses the provided billing name when updating billing address', async () => {
    const activity = createActivity()
    const { billingPreferences, organizations, useCase } = createUseCase({ activity })
    const address = createAddress()

    const result = await useCase.updateBillingAddress({
      organizationId: 'org-1',
      address,
      name: '  Billing Team  ',
      actorId: 'user-1',
    })

    expect(result).toEqual(address)
    expect(organizations.getOrganizationName).toHaveBeenCalledWith('org-1')
    expect(billingPreferences.updateBillingAddress).toHaveBeenCalledWith({
      customerId: 'cus-1',
      address,
      name: 'Billing Team',
    })
    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-billing-address-updated',
      description: 'updated billing address',
    })
  })

  it('falls back to the organization name when billing address name is empty', async () => {
    const { billingPreferences, useCase } = createUseCase({
      organizations: createOrganizations({ name: 'Ortelius' }),
    })
    const address = createAddress()

    await useCase.updateBillingAddress({
      organizationId: 'org-1',
      address,
      name: ' ',
    })

    expect(billingPreferences.updateBillingAddress).toHaveBeenCalledWith({
      customerId: 'cus-1',
      address,
      name: 'Ortelius',
    })
  })

  it('rejects invalid billing addresses before ensuring a Stripe customer', async () => {
    const { customerRegistry, useCase } = createUseCase()

    await expect(
      useCase.updateBillingAddress({
        organizationId: 'org-1',
        address: createAddress({ country: 'BEL' }),
      })
    ).rejects.toThrow(BillingAddressError)

    expect(customerRegistry.ensureCustomer).not.toHaveBeenCalled()
  })
})
