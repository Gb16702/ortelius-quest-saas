import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import type { StripeSubscriptionInvoicePort } from '../application/ports'
import type {
  SubscriptionInvoiceAccount,
  SubscriptionInvoiceAddress,
  SubscriptionInvoiceCustomer,
  SubscriptionInvoiceDetail,
  SubscriptionInvoiceDiscount,
  SubscriptionInvoiceListResult,
  SubscriptionInvoicePaymentMethod,
  SubscriptionInvoiceTax,
} from '../domain'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

function mapAddress(address: Stripe.Address | null | undefined): SubscriptionInvoiceAddress | null {
  if (!address) return null
  return {
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    country: address.country,
  }
}

function readNumberField(source: object, key: string): number | null {
  if (!(key in source)) return null
  const value = (source as Record<string, unknown>)[key]
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return value
}

function readTaxRatePercentage(taxRateField: unknown): number | null {
  if (!taxRateField || typeof taxRateField !== 'object') return null
  return (
    readNumberField(taxRateField, 'effective_percentage') ??
    readNumberField(taxRateField, 'percentage')
  )
}

function extractInvoiceTax(invoice: Stripe.Invoice): SubscriptionInvoiceTax | null {
  const totalTaxes = invoice.total_taxes ?? []
  if (totalTaxes.length === 0) return null

  const amount = totalTaxes.reduce((sum, tax) => sum + tax.amount, 0)
  const taxableAmount = totalTaxes.reduce((sum, tax) => sum + (tax.taxable_amount ?? 0), 0)

  const ratePercent =
    totalTaxes.length === 1 ? readTaxRatePercentage(totalTaxes[0].tax_rate_details?.tax_rate) : null

  return {
    amount,
    taxableAmount: taxableAmount > 0 ? taxableAmount : null,
    ratePercent,
  }
}

interface CardLike {
  brand?: string | null
  last4?: string | null
  exp_month?: number | null
  exp_year?: number | null
}

function buildPaymentMethodDto(
  type: string,
  card: CardLike | null
): SubscriptionInvoicePaymentMethod {
  if (type === 'card' && card) {
    return {
      type: 'card',
      brand: card.brand ?? null,
      last4: card.last4 ?? null,
      expMonth: card.exp_month ?? null,
      expYear: card.exp_year ?? null,
    }
  }
  return { type, brand: null, last4: null, expMonth: null, expYear: null }
}

function paymentMethodToDto(paymentMethod: Stripe.PaymentMethod): SubscriptionInvoicePaymentMethod {
  return buildPaymentMethodDto(paymentMethod.type, paymentMethod.card ?? null)
}

function chargeToPaymentMethodDto(charge: Stripe.Charge): SubscriptionInvoicePaymentMethod | null {
  const details = charge.payment_method_details
  if (!details) return null
  return buildPaymentMethodDto(details.type, details.card ?? null)
}

async function resolvePaymentIntentMethod(
  paymentIntent: Stripe.PaymentIntent
): Promise<SubscriptionInvoicePaymentMethod | null> {
  const paymentMethod = paymentIntent.payment_method
  if (!paymentMethod) return null

  if (typeof paymentMethod !== 'string') {
    return paymentMethodToDto(paymentMethod)
  }

  try {
    const fetched = await stripeClient.paymentMethods.retrieve(paymentMethod)
    return paymentMethodToDto(fetched)
  } catch (error) {
    console.error('Error retrieving payment method:', error)
    return null
  }
}

async function extractPaymentMethod(
  invoice: Stripe.Invoice
): Promise<SubscriptionInvoicePaymentMethod | null> {
  const firstPayment = invoice.payments?.data[0]
  if (!firstPayment) return null

  const payment = firstPayment.payment

  if (payment.type === 'payment_intent') {
    const paymentIntent = payment.payment_intent
    if (!paymentIntent || typeof paymentIntent === 'string') return null
    return resolvePaymentIntentMethod(paymentIntent)
  }

  if (payment.type === 'charge') {
    const charge = payment.charge
    if (!charge || typeof charge === 'string') return null
    return chargeToPaymentMethodDto(charge)
  }

  return null
}

function extractInvoiceCustomer(invoice: Stripe.Invoice): SubscriptionInvoiceCustomer | null {
  const hasAny =
    invoice.customer_name != null ||
    invoice.customer_email != null ||
    invoice.customer_address != null
  if (!hasAny) return null
  return {
    name: invoice.customer_name,
    email: invoice.customer_email,
    address: mapAddress(invoice.customer_address),
  }
}

function extractInvoiceAccount(invoice: Stripe.Invoice): SubscriptionInvoiceAccount | null {
  const taxIds = (invoice.account_tax_ids ?? [])
    .filter(
      (entry): entry is Stripe.TaxId =>
        typeof entry === 'object' && entry !== null && 'value' in entry && !('deleted' in entry)
    )
    .map((entry) => ({ type: entry.type, value: entry.value }))

  if (!invoice.account_name && !invoice.account_country && taxIds.length === 0) return null

  return {
    name: invoice.account_name,
    country: invoice.account_country,
    taxIds,
  }
}

function extractInvoiceDiscount(invoice: Stripe.Invoice): SubscriptionInvoiceDiscount | null {
  const discounts = invoice.total_discount_amounts ?? []
  if (discounts.length === 0) return null
  const amount = discounts.reduce((sum, discount) => sum + discount.amount, 0)
  if (amount === 0) return null
  return { amount }
}

export class StripeSubscriptionInvoiceAdapter implements StripeSubscriptionInvoicePort {
  async listInvoices(input: {
    customerId: string
    limit: number
    startingAfter?: string
  }): Promise<SubscriptionInvoiceListResult> {
    const invoices = await stripeClient.invoices.list({
      customer: input.customerId,
      limit: input.limit,
      starting_after: input.startingAfter,
    })

    return {
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        currency: invoice.currency,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
        invoicePdf: invoice.invoice_pdf ?? null,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
        created: invoice.created,
      })),
      hasMore: invoices.has_more,
    }
  }

  async retrieveInvoice(input: {
    invoiceId: string
    customerId: string
  }): Promise<SubscriptionInvoiceDetail | null> {
    const invoice = await stripeClient.invoices.retrieve(input.invoiceId, {
      expand: [
        'payments.data.payment.payment_intent',
        'payments.data.payment.charge',
        'total_taxes.tax_rate_details.tax_rate',
        'account_tax_ids',
      ],
    })

    if (invoice.customer !== input.customerId) {
      return null
    }

    const lineItems = invoice.lines.data.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitAmount: line.pricing?.unit_amount_decimal
        ? Math.round(Number(line.pricing.unit_amount_decimal))
        : 0,
      amount: line.amount,
      currency: line.currency,
      periodStart: line.period.start,
      periodEnd: line.period.end,
    }))

    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      currency: invoice.currency,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      subtotal: invoice.subtotal,
      total: invoice.total,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      created: invoice.created,
      paidAt: invoice.status_transitions?.paid_at ?? null,
      tax: extractInvoiceTax(invoice),
      paymentMethod: await extractPaymentMethod(invoice),
      customer: extractInvoiceCustomer(invoice),
      account: extractInvoiceAccount(invoice),
      discount: extractInvoiceDiscount(invoice),
      lineItems,
    }
  }
}
