import type {
  DraftRequestRecord,
  ExtractedRequestData,
  ExtractionContext,
  InboundOrganization,
  PostmarkInboundPayload,
  StripeWebhookEvent,
  StripeWebhookInvoiceSnapshot,
  StripeWebhookSubscriptionSnapshot,
} from './webhook-models'

export interface InboundOrganizationPort {
  getOrganizationBySlug(slug: string): Promise<InboundOrganization | null>
}

export interface InboundRequestPort {
  existsBySourceEmailId(messageId: string): Promise<boolean>
  createDraftRequest(record: DraftRequestRecord): Promise<void>
}

export interface ExtractionContextPort {
  getExtractionContext(organizationId: string): Promise<ExtractionContext>
}

export interface EmailExtractionPort {
  extractFromEmail(
    payload: PostmarkInboundPayload,
    context: ExtractionContext
  ): Promise<ExtractedRequestData>
}

export interface WebhookIdPort {
  newRequestId(): string
}

export interface WebhookClockPort {
  now(): Date
}

export interface PostmarkInboundUseCaseDependencies {
  organizations: InboundOrganizationPort
  requests: InboundRequestPort
  extractionContext: ExtractionContextPort
  emailExtraction: EmailExtractionPort
  ids: WebhookIdPort
  clock: WebhookClockPort
}

export interface StripeWebhookVerifierPort {
  constructEvent(rawBody: string, signature: string): Promise<StripeWebhookEvent>
}

export interface SubscriptionWebhookPort {
  handleSubscriptionUpdated(snapshot: StripeWebhookSubscriptionSnapshot): Promise<void>
  handleSubscriptionDeleted(input: { stripeSubscriptionId: string }): Promise<void>
  handleInvoicePaymentFailed(snapshot: StripeWebhookInvoiceSnapshot): Promise<void>
  handleInvoicePaymentSucceeded(snapshot: StripeWebhookInvoiceSnapshot): Promise<void>
}

export interface StripeWebhookUseCaseDependencies {
  verifier: StripeWebhookVerifierPort
  subscriptions: SubscriptionWebhookPort
}
