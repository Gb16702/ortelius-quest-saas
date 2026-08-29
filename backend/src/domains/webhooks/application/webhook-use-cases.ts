import {
  defaultInboundRequestDates,
  extractOrgSlugFromInboundEmail,
  requestNumberFromDate,
} from '../domain'
import type { PostmarkInboundUseCaseDependencies, StripeWebhookUseCaseDependencies } from './ports'
import type { PostmarkInboundPayload, StripeWebhookEvent } from './webhook-models'

export class InvalidStripeWebhookSignatureError extends Error {
  constructor(message = 'Invalid signature') {
    super(message)
    this.name = 'InvalidStripeWebhookSignatureError'
  }
}

export class ProcessPostmarkInboundUseCase {
  constructor(private readonly deps: PostmarkInboundUseCaseDependencies) {}

  async execute(payload: PostmarkInboundPayload): Promise<void> {
    const orgSlug = extractOrgSlugFromInboundEmail(payload.To)
    if (!orgSlug) {
      console.log(`[Webhook] Invalid email format: ${payload.To}`)
      return
    }

    const org = await this.deps.organizations.getOrganizationBySlug(orgSlug)
    if (!org) {
      console.log(`[Webhook] Organization not found: ${orgSlug}`)
      return
    }

    if (!org.emailIntakeEnabled) {
      console.log(`[Webhook] Email intake disabled for org: ${orgSlug}`)
      return
    }

    const isDuplicate = await this.deps.requests.existsBySourceEmailId(payload.MessageID)
    if (isDuplicate) {
      console.log(`[Webhook] Duplicate email: ${payload.MessageID}`)
      return
    }

    const context = await this.deps.extractionContext.getExtractionContext(org.id)
    const extractedData = await this.deps.emailExtraction.extractFromEmail(payload, context)

    const now = this.deps.clock.now()
    const dates = defaultInboundRequestDates(now)

    await this.deps.requests.createDraftRequest({
      id: this.deps.ids.newRequestId(),
      reqNumber: requestNumberFromDate(now),
      requesterEmail: payload.From,
      requesterName: extractedData.requesterName || payload.FromName || 'Unknown',
      requesterPhone: extractedData.requesterPhone,
      receiverOrganizationId: org.id,
      categories: extractedData.categories,
      services: extractedData.services,
      extraServices: extractedData.extraServices,
      comments: payload.Subject,
      fromDate: extractedData.fromDate ? new Date(extractedData.fromDate) : dates.fromDate,
      toDate: extractedData.toDate ? new Date(extractedData.toDate) : dates.toDate,
      sourceEmailId: payload.MessageID,
      createdAt: now,
      updatedAt: now,
    })

    console.log(`[Webhook] Draft request created for org: ${orgSlug}`)
  }
}

export class ProcessStripeWebhookUseCase {
  constructor(private readonly deps: StripeWebhookUseCaseDependencies) {}

  async execute(input: { rawBody: string; signature: string }): Promise<void> {
    let event: StripeWebhookEvent
    try {
      event = await this.deps.verifier.constructEvent(input.rawBody, input.signature)
    } catch (error) {
      console.error('[StripeWebhook] Signature verification failed:', error)
      throw new InvalidStripeWebhookSignatureError()
    }

    try {
      switch (event.type) {
        case 'customer.subscription.updated':
          if ('subscription' in event) {
            await this.deps.subscriptions.handleSubscriptionUpdated(event.subscription)
          }
          break
        case 'customer.subscription.deleted':
          if ('stripeSubscriptionId' in event) {
            await this.deps.subscriptions.handleSubscriptionDeleted({
              stripeSubscriptionId: event.stripeSubscriptionId,
            })
          }
          break
        case 'invoice.payment_failed':
          if ('invoice' in event) {
            await this.deps.subscriptions.handleInvoicePaymentFailed(event.invoice)
          }
          break
        case 'invoice.payment_succeeded':
          if ('invoice' in event) {
            await this.deps.subscriptions.handleInvoicePaymentSucceeded(event.invoice)
          }
          break
        default:
          break
      }
    } catch (error) {
      console.error(
        `[StripeWebhook] Error processing event type=${event.type} id=${event.id}:`,
        error
      )
    }
  }
}
