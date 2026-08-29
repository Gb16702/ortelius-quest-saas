export type SubscriptionBillingMembership = {
  organizationId: string
  role: string
}

export type SubscriptionInvoiceSummary = {
  id: string
  number: string | null
  status: string | null
  currency: string
  amountDue: number
  amountPaid: number
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  periodStart: number
  periodEnd: number
  created: number
}

export type SubscriptionInvoiceListResult = {
  invoices: SubscriptionInvoiceSummary[]
  hasMore: boolean
}

export type SubscriptionInvoiceAddress = {
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

export type SubscriptionInvoiceTax = {
  amount: number
  taxableAmount: number | null
  ratePercent: number | null
}

export type SubscriptionInvoicePaymentMethod = {
  type: string
  brand: string | null
  last4: string | null
  expMonth: number | null
  expYear: number | null
}

export type SubscriptionInvoiceCustomer = {
  name: string | null
  email: string | null
  address: SubscriptionInvoiceAddress | null
}

export type SubscriptionInvoiceAccountTaxId = {
  type: string
  value: string
}

export type SubscriptionInvoiceAccount = {
  name: string | null
  country: string | null
  taxIds: SubscriptionInvoiceAccountTaxId[]
}

export type SubscriptionInvoiceDiscount = {
  amount: number
}

export type SubscriptionInvoiceLineItem = {
  id: string
  description: string | null
  quantity: number | null
  unitAmount: number
  amount: number
  currency: string
  periodStart: number
  periodEnd: number
}

export type SubscriptionInvoiceDetail = SubscriptionInvoiceSummary & {
  subtotal: number
  total: number
  paidAt: number | null
  tax: SubscriptionInvoiceTax | null
  paymentMethod: SubscriptionInvoicePaymentMethod | null
  customer: SubscriptionInvoiceCustomer | null
  account: SubscriptionInvoiceAccount | null
  discount: SubscriptionInvoiceDiscount | null
  lineItems: SubscriptionInvoiceLineItem[]
}

export type SubscriptionPortalSessionResult = {
  url: string
}

export type EnsureSubscriptionCustomerResult = {
  stripeCustomerId: string
}

export class SubscriptionBillingAccountError extends Error {
  constructor(
    public code:
      | 'NO_ORGANIZATION'
      | 'INSUFFICIENT_PERMISSIONS'
      | 'NO_ACTIVE_SUBSCRIPTION'
      | 'INVOICE_NOT_FOUND'
      | 'ORGANIZATION_NOT_FOUND'
      | 'STRIPE_UNAVAILABLE',
    message: string
  ) {
    super(message)
  }
}

export function assertCanManageSubscriptionBilling(
  membership: SubscriptionBillingMembership | null
): asserts membership is SubscriptionBillingMembership {
  if (!membership) {
    throw new SubscriptionBillingAccountError('NO_ORGANIZATION', 'No organization found')
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    throw new SubscriptionBillingAccountError(
      'INSUFFICIENT_PERMISSIONS',
      'Insufficient permissions'
    )
  }
}

export function buildEmptySubscriptionInvoiceList(): SubscriptionInvoiceListResult {
  return { invoices: [], hasMore: false }
}

export function assertActiveSubscriptionCustomerId(
  stripeCustomerId: string | null
): asserts stripeCustomerId is string {
  if (!stripeCustomerId) {
    throw new SubscriptionBillingAccountError(
      'NO_ACTIVE_SUBSCRIPTION',
      'No active subscription found'
    )
  }
}

export function assertSubscriptionInvoiceFound(
  invoice: SubscriptionInvoiceDetail | null
): asserts invoice is SubscriptionInvoiceDetail {
  if (!invoice) {
    throw new SubscriptionBillingAccountError('INVOICE_NOT_FOUND', 'Invoice not found')
  }
}

export function assertSubscriptionInvoiceCustomerId(
  stripeCustomerId: string | null
): asserts stripeCustomerId is string {
  if (!stripeCustomerId) {
    throw new SubscriptionBillingAccountError('INVOICE_NOT_FOUND', 'Invoice not found')
  }
}

export function buildEnsureSubscriptionCustomerResult(
  stripeCustomerId: string
): EnsureSubscriptionCustomerResult {
  return { stripeCustomerId }
}
