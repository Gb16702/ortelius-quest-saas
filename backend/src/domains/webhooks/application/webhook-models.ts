export interface PostmarkInboundPayload {
  From: string
  FromName: string
  FromFull: {
    Email: string
    Name: string
    MailboxHash: string
  }
  To: string
  ToFull: Array<{
    Email: string
    Name: string
    MailboxHash: string
  }>
  Subject: string
  TextBody: string
  HtmlBody?: string
  MessageID: string
  MessageStream?: string
  Date: string
  OriginalRecipient?: string
  ReplyTo?: string
  MailboxHash?: string
  Tag?: string
  Headers?: Array<{
    Name: string
    Value: string
  }>
  Attachments?: Array<{
    Name: string
    Content: string
    ContentType: string
    ContentLength: number
  }>
}

export interface ExtractedRequestData {
  requesterName: string | null
  requesterPhone: string | null
  categories: string[] | null
  services: string[] | null
  extraServices: string[] | null
  cargoDetails: {
    weight: number | null
    volume: number | null
    palletCount: number | null
    fragility: 'fragile' | 'robust' | null
    dimensions: { length: number; width: number; height: number } | null
    options: {
      refrigerated: boolean
      hazardous: boolean
      oversized: boolean
    } | null
  } | null
  fromDate: string | null
  toDate: string | null
}

export interface OrganizationOption {
  id: string
  name: string
}

export interface ExtractionContext {
  availableServices: OrganizationOption[]
  availableCategories: OrganizationOption[]
}

export interface InboundOrganization {
  id: string
  slug: string
  emailIntakeEnabled: boolean | null
}

export interface DraftRequestRecord {
  id: string
  reqNumber: string
  requesterEmail: string
  requesterName: string
  requesterPhone: string | null
  receiverOrganizationId: string
  categories: string[] | null
  services: string[] | null
  extraServices: string[] | null
  comments: string
  fromDate: Date
  toDate: Date
  sourceEmailId: string
  createdAt: Date
  updatedAt: Date
}

export interface StripeWebhookSubscriptionSnapshot {
  stripeSubscriptionId: string
  status: string
  seats: number
  periodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export interface StripeWebhookInvoiceSnapshot {
  invoiceId: string
  stripeSubscriptionId: string | null
}

export type StripeWebhookEvent =
  | {
      id: string
      type: 'customer.subscription.updated'
      subscription: StripeWebhookSubscriptionSnapshot
    }
  | {
      id: string
      type: 'customer.subscription.deleted'
      stripeSubscriptionId: string
    }
  | {
      id: string
      type: 'invoice.payment_failed' | 'invoice.payment_succeeded'
      invoice: StripeWebhookInvoiceSnapshot
    }
  | {
      id: string
      type: string
    }
