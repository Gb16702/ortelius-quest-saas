export class PaymentMethodError extends Error {
  constructor(
    public code: 'INVALID_PAYMENT_METHOD' | 'STRIPE_UNAVAILABLE',
    message: string
  ) {
    super(message)
  }
}

export interface PaymentMethodCardInfo {
  type: 'card'
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export interface PaymentMethodSepaInfo {
  type: 'sepa_debit'
  last4: string
  bankCode: string | null
}

export type PaymentMethodInfo = PaymentMethodCardInfo | PaymentMethodSepaInfo

export interface SetupIntentResult {
  clientSecret: string
}

export interface UpdatePaymentMethodInput {
  organizationId: string
  paymentMethodId: string
}

export interface UpdatePaymentMethodResult {
  success: true
  paymentMethod: PaymentMethodInfo | null
}

export type ActivePaymentSubscription = {
  stripeSubscriptionId: string | null
  status: string
}

export type PaymentMethodCandidate = {
  id: string
  customerId: string | null
  info: PaymentMethodInfo | null
}

export function buildSetupIntentResult(clientSecret: string | null): SetupIntentResult {
  if (!clientSecret) {
    throw new PaymentMethodError(
      'STRIPE_UNAVAILABLE',
      "Couldn't prepare the payment setup. Please try again."
    )
  }

  return { clientSecret }
}

export function assertPaymentMethodExists(
  paymentMethod: PaymentMethodCandidate | null
): asserts paymentMethod is PaymentMethodCandidate {
  if (!paymentMethod) {
    throw new PaymentMethodError('INVALID_PAYMENT_METHOD', "This payment method doesn't exist.")
  }
}

export function assertPaymentMethodBelongsToCustomer(
  paymentMethod: PaymentMethodCandidate,
  customerId: string
): void {
  if (paymentMethod.customerId && paymentMethod.customerId !== customerId) {
    throw new PaymentMethodError(
      'INVALID_PAYMENT_METHOD',
      'This payment method belongs to a different customer.'
    )
  }
}

export function shouldAttachPaymentMethod(paymentMethod: PaymentMethodCandidate): boolean {
  return !paymentMethod.customerId
}

export function shouldRetryLatestOpenInvoice(
  subscription: ActivePaymentSubscription | null
): boolean {
  return subscription?.status === 'past_due'
}

export function shouldDetachPreviousPaymentMethod(
  previousPaymentMethodId: string | null,
  nextPaymentMethodId: string
): previousPaymentMethodId is string {
  return Boolean(previousPaymentMethodId && previousPaymentMethodId !== nextPaymentMethodId)
}

export function buildUpdatePaymentMethodResult(
  paymentMethod: PaymentMethodCandidate
): UpdatePaymentMethodResult {
  return {
    success: true,
    paymentMethod: paymentMethod.info,
  }
}
