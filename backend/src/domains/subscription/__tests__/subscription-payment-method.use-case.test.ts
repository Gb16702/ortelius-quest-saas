import { describe, expect, it, mock } from 'bun:test'
import type {
  StripePaymentMethodPort,
  SubscriptionActivityPort,
  SubscriptionCustomerRegistryPort,
  SubscriptionPaymentMethodRepositoryPort,
} from '../application/ports'
import { SubscriptionPaymentMethodUseCase } from '../application/subscription-payment-method.use-cases'
import {
  type ActivePaymentSubscription,
  type PaymentMethodCandidate,
  PaymentMethodError,
} from '../domain'

function createCustomerRegistry(
  input: { customerId?: string | null } = {}
): SubscriptionCustomerRegistryPort {
  return {
    getCustomerId: mock(async () => (input.customerId === undefined ? 'cus-1' : input.customerId)),
    ensureCustomer: mock(async () => input.customerId ?? 'cus-1'),
  }
}

function createSubscription(
  overrides: Partial<ActivePaymentSubscription> = {}
): ActivePaymentSubscription {
  return {
    stripeSubscriptionId: 'stripe-sub-1',
    status: 'active',
    ...overrides,
  }
}

function createPaymentMethod(
  overrides: Partial<PaymentMethodCandidate> = {}
): PaymentMethodCandidate {
  return {
    id: 'pm-1',
    customerId: 'cus-1',
    info: {
      type: 'card',
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2030,
    },
    ...overrides,
  }
}

function createRepository(
  input: { subscription?: ActivePaymentSubscription | null } = {}
): SubscriptionPaymentMethodRepositoryPort {
  return {
    findActiveSubscription: mock(async () =>
      input.subscription === undefined ? createSubscription() : input.subscription
    ),
  }
}

function createPaymentMethods(
  input: {
    paymentMethod?: PaymentMethodCandidate | null
    previousPaymentMethodId?: string | null
    clientSecret?: string | null
  } = {}
): StripePaymentMethodPort {
  return {
    getDefaultPaymentMethod: mock(async () => createPaymentMethod().info),
    createSetupIntent: mock(async () =>
      input.clientSecret === undefined ? 'seti_secret_1' : input.clientSecret
    ),
    retrievePaymentMethod: mock(async () =>
      input.paymentMethod === undefined ? createPaymentMethod() : input.paymentMethod
    ),
    attachPaymentMethod: mock(async () => undefined),
    setCustomerDefaultPaymentMethod: mock(async () =>
      input.previousPaymentMethodId === undefined ? 'pm-old' : input.previousPaymentMethodId
    ),
    setSubscriptionDefaultPaymentMethod: mock(async () => undefined),
    retryLatestOpenInvoice: mock(async () => undefined),
    detachPaymentMethod: mock(async () => undefined),
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
    paymentMethods?: StripePaymentMethodPort
    subscriptions?: SubscriptionPaymentMethodRepositoryPort
    activity?: SubscriptionActivityPort
  } = {}
) {
  const customerRegistry = input.customerRegistry ?? createCustomerRegistry()
  const paymentMethods = input.paymentMethods ?? createPaymentMethods()
  const subscriptions = input.subscriptions ?? createRepository()
  const activity = input.activity ?? createActivity()

  return {
    customerRegistry,
    paymentMethods,
    subscriptions,
    activity,
    useCase: new SubscriptionPaymentMethodUseCase(
      customerRegistry,
      paymentMethods,
      subscriptions,
      activity
    ),
  }
}

describe('Subscription payment method use case', () => {
  it('does not create a Stripe customer when reading a missing payment method', async () => {
    const { customerRegistry, paymentMethods, useCase } = createUseCase({
      customerRegistry: createCustomerRegistry({ customerId: null }),
    })

    const result = await useCase.getPaymentMethod({ organizationId: 'org-1' })

    expect(result).toBeNull()
    expect(customerRegistry.ensureCustomer).not.toHaveBeenCalled()
    expect(paymentMethods.getDefaultPaymentMethod).not.toHaveBeenCalled()
  })

  it('creates setup intents with active subscription metadata', async () => {
    const { customerRegistry, paymentMethods, useCase } = createUseCase()

    const result = await useCase.createSetupIntent({ organizationId: 'org-1' })

    expect(result).toEqual({ clientSecret: 'seti_secret_1' })
    expect(customerRegistry.ensureCustomer).toHaveBeenCalledWith({ organizationId: 'org-1' })
    expect(paymentMethods.createSetupIntent).toHaveBeenCalledWith({
      customerId: 'cus-1',
      organizationId: 'org-1',
      subscriptionId: 'stripe-sub-1',
    })
  })

  it('rejects setup intents without a client secret', async () => {
    const { useCase } = createUseCase({
      paymentMethods: createPaymentMethods({ clientSecret: null }),
    })

    await expect(useCase.createSetupIntent({ organizationId: 'org-1' })).rejects.toThrow(
      PaymentMethodError
    )
  })

  it('rejects missing payment methods before updating customer defaults', async () => {
    const { paymentMethods, useCase } = createUseCase({
      paymentMethods: createPaymentMethods({ paymentMethod: null }),
    })

    await expect(
      useCase.updatePaymentMethod({ organizationId: 'org-1', paymentMethodId: 'pm-missing' })
    ).rejects.toThrow(PaymentMethodError)
    expect(paymentMethods.setCustomerDefaultPaymentMethod).not.toHaveBeenCalled()
  })

  it('rejects payment methods owned by another customer', async () => {
    const { paymentMethods, useCase } = createUseCase({
      paymentMethods: createPaymentMethods({
        paymentMethod: createPaymentMethod({ customerId: 'cus-other' }),
      }),
    })

    await expect(
      useCase.updatePaymentMethod({ organizationId: 'org-1', paymentMethodId: 'pm-1' })
    ).rejects.toThrow(PaymentMethodError)
    expect(paymentMethods.attachPaymentMethod).not.toHaveBeenCalled()
    expect(paymentMethods.setCustomerDefaultPaymentMethod).not.toHaveBeenCalled()
  })

  it('attaches new payment methods, updates subscription default, retries past-due invoice, and detaches previous PM', async () => {
    const activity = createActivity()
    const { paymentMethods, useCase } = createUseCase({
      activity,
      paymentMethods: createPaymentMethods({
        paymentMethod: createPaymentMethod({ customerId: null }),
        previousPaymentMethodId: 'pm-old',
      }),
      subscriptions: createRepository({
        subscription: createSubscription({ status: 'past_due' }),
      }),
    })

    const result = await useCase.updatePaymentMethod({
      organizationId: 'org-1',
      paymentMethodId: 'pm-1',
      actorId: 'user-1',
    })

    expect(result).toEqual({
      success: true,
      paymentMethod: {
        type: 'card',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
      },
    })
    expect(paymentMethods.attachPaymentMethod).toHaveBeenCalledWith('pm-1', 'cus-1')
    expect(paymentMethods.setCustomerDefaultPaymentMethod).toHaveBeenCalledWith('cus-1', 'pm-1')
    expect(paymentMethods.setSubscriptionDefaultPaymentMethod).toHaveBeenCalledWith(
      'stripe-sub-1',
      'pm-1'
    )
    expect(paymentMethods.retryLatestOpenInvoice).toHaveBeenCalledWith('cus-1', 'pm-1')
    expect(paymentMethods.detachPaymentMethod).toHaveBeenCalledWith('pm-old')
    expect(activity.logEvent).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorId: 'user-1',
      eventType: 'subscription-payment-method-updated',
      description: 'updated default payment method',
    })
  })

  it('does not detach the previous payment method when it is the selected one', async () => {
    const { paymentMethods, useCase } = createUseCase({
      paymentMethods: createPaymentMethods({ previousPaymentMethodId: 'pm-1' }),
    })

    await useCase.updatePaymentMethod({
      organizationId: 'org-1',
      paymentMethodId: 'pm-1',
    })

    expect(paymentMethods.detachPaymentMethod).not.toHaveBeenCalled()
  })
})
