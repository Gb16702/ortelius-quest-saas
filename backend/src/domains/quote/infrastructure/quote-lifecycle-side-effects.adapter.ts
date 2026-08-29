import { and, eq, inArray } from 'drizzle-orm'
import { EmailService } from '../../../../emails/services/email.service'
import { EmailTemplate } from '../../../../emails/types'
import { buildAuthLink } from '../../../infrastructure/auth/auth-link'
import { db } from '../../../infrastructure/database'
import { member, organization, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'
import { invoiceApplicationService } from '../../invoice/invoice.application'
import { messageApplicationService as messageService } from '../../messaging/message/message.application'
import { metricsApplicationService as metricsService } from '../../metrics/metrics.application'
import { memberMetricsService } from '../../metrics/services/member-metrics.service'
import { notificationApplicationService } from '../../notifications/notifications.application'
import type { QuoteLifecycleSideEffectsPort, QuoteRecord } from '../application/ports'

type QuotePricingSnapshot = {
  totalTTC?: number
  currency?: string
}

type QuoteNotificationContext = {
  request: typeof request.$inferSelect
  organization: typeof organization.$inferSelect
  requester: typeof user.$inferSelect | null
}

type OrganizationAdmin = {
  user: {
    id: string
    name: string
    email: string
  }
}

export class QuoteLifecycleSideEffectsAdapter implements QuoteLifecycleSideEffectsPort {
  async afterQuoteSent(data: {
    quote: QuoteRecord
    actorId: string
    totalTTC?: number
  }): Promise<void> {
    await Promise.all([
      this.recordQuoteCreatedMetrics(data.quote, data.actorId, data.totalTTC),
      this.notifyQuoteSent(data.quote, data.actorId, data.totalTTC),
    ])
  }

  async afterQuoteAccepted(data: { quote: QuoteRecord; actorId: string }): Promise<void> {
    await this.createInvoiceForAcceptedQuote(data.quote)
    await Promise.all([
      this.captureAcceptedQuotePricing(data.quote),
      this.notifyQuoteAccepted(data.quote, data.actorId),
    ])
  }

  async afterQuoteRejected(data: {
    quote: QuoteRecord
    actorId: string
    rejectionReason: string
  }): Promise<void> {
    await this.notifyQuoteRejected(data.quote, data.actorId, data.rejectionReason)
  }

  private async recordQuoteCreatedMetrics(
    quote: QuoteRecord,
    actorId: string,
    totalTTC = 0
  ): Promise<void> {
    const organizationId = this.getOrganizationId(quote)
    if (!organizationId) return

    try {
      await metricsService.incrementQuoteMetric(organizationId, totalTTC)
      await memberMetricsService.incrementMemberQuote(actorId, organizationId, totalTTC)
    } catch (error) {
      console.error('Failed to update metrics for quote:', error)
    }
  }

  private async createInvoiceForAcceptedQuote(quote: QuoteRecord): Promise<void> {
    const createdById = this.getString(quote.createdById)
    if (!createdById) return

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    await invoiceApplicationService.createInvoiceFromQuote({
      quoteId: quote.id,
      actorId: createdById,
      dueDate,
      logActivity: false,
      acceptedByRequester: true,
    })
  }

  private async captureAcceptedQuotePricing(quote: QuoteRecord): Promise<void> {
    const organizationId = this.getOrganizationId(quote)
    if (!organizationId) return

    try {
      const { pricingIntelligenceApplicationService } = await import(
        '../../pricing-intelligence/pricing-intelligence.application'
      )
      await pricingIntelligenceApplicationService.captureFromAcceptedQuote(quote.id, organizationId)
    } catch (error) {
      console.error('[Pricing Intelligence] Failed to capture:', error)
    }
  }

  private async notifyQuoteSent(quote: QuoteRecord, actorId: string, totalTTC = 0): Promise<void> {
    try {
      const context = await this.loadNotificationContext(quote)
      if (!context) return

      const requesterName = context.requester?.name ?? context.request.requesterName
      const requesterEmail = context.requester?.email ?? context.request.requesterEmail
      const quoteNumber = this.getQuoteNumber(quote)

      await EmailService.sendTemplatedEmail(
        EmailTemplate.QUOTE_SENT,
        {
          username: requesterName,
          quoteNumber,
          organizationName: context.organization.name,
          totalAmount: totalTTC.toString(),
          currency: 'EUR',
          dashboardLink: buildAuthLink({
            email: requesterEmail,
            redirectPath: context.request.requesterId
              ? `/dashboard/requests/${context.request.id}/quotes/${quote.id}`
              : `/request/${context.request.id}/quotes/${quote.id}`,
          }),
        },
        {
          to: requesterEmail,
          subject: `New Quote Received - ${quoteNumber}`,
          organizationId: context.organization.id,
        }
      )

      if (context.request.conversationId) {
        await this.createSystemMessage({
          conversationId: context.request.conversationId,
          content: `Quote ${quoteNumber} has been sent by ${context.organization.name}`,
          senderId: actorId,
          metadata: {
            requestId: context.request.id,
            requestNumber: context.request.reqNumber,
            quoteId: quote.id,
            quoteNumber,
            eventType: 'quote_sent',
            organizationId: context.organization.id,
            amount: totalTTC,
            currency: 'EUR',
          },
        })
      }

      if (context.request.requesterId) {
        await this.notifyRequestUpdate(context.request.requesterId, {
          requestId: context.request.id,
          lifecycleStatus: 'quoted',
          closedReason: null,
          details: `${context.organization.name} sent you a quote for ${totalTTC}€`,
          organizationName: context.organization.name,
          requestNumber: context.request.reqNumber,
          action: 'request_quoted',
        })
      }
    } catch (error) {
      console.error('Failed to send quote notification:', error)
    }
  }

  private async notifyQuoteAccepted(quote: QuoteRecord, actorId: string): Promise<void> {
    try {
      const context = await this.loadNotificationContext(quote)
      if (!context) return

      const pricing = this.getPricing(quote)
      const totalAmount = pricing.totalTTC ?? 0
      const currency = pricing.currency ?? 'EUR'
      const requesterName = context.requester?.name ?? context.request.requesterName
      const requesterEmail = context.requester?.email ?? context.request.requesterEmail
      const quoteNumber = this.getQuoteNumber(quote)

      await EmailService.sendTemplatedEmail(
        EmailTemplate.QUOTE_ACCEPTED,
        {
          username: requesterName,
          quoteNumber,
          organizationName: context.organization.name,
          totalAmount: totalAmount.toString(),
          currency,
          dashboardLink: buildAuthLink({
            email: requesterEmail,
            redirectPath: context.request.requesterId
              ? `/dashboard/requests/${context.request.id}/quotes/${quote.id}`
              : `/request/${context.request.id}/quotes/${quote.id}`,
          }),
        },
        {
          to: requesterEmail,
          subject: `Quote ${quoteNumber} has been accepted`,
          organizationId: context.organization.id,
        }
      )

      if (context.request.conversationId) {
        await this.createSystemMessage({
          conversationId: context.request.conversationId,
          content: `Quote ${quoteNumber} has been accepted by ${requesterName}`,
          senderId: actorId,
          metadata: {
            quoteId: quote.id,
            quoteNumber,
            eventType: 'quote_accepted',
            requestId: context.request.id,
            amount: totalAmount,
            currency,
          },
        })
      }

      const admins = await this.getAdminsAndOwners(context.organization.id)
      for (const admin of admins) {
        await EmailService.sendTemplatedEmail(
          EmailTemplate.QUOTE_ACCEPTED_ORGANIZATION,
          {
            username: admin.user.name,
            quoteNumber,
            requesterName,
            totalAmount: totalAmount.toString(),
            currency,
            dashboardLink: buildAuthLink({
              email: admin.user.email,
              redirectPath: `/org/${context.organization.slug}/requests`,
            }),
          },
          {
            to: admin.user.email,
            subject: `Quote ${quoteNumber} accepted by client`,
            organizationId: context.organization.id,
          }
        )

        await this.notifyRequestUpdate(admin.user.id, {
          requestId: context.request.id,
          lifecycleStatus: 'quoted',
          closedReason: null,
          details: `${requesterName} accepted your quote ${quoteNumber} for ${totalAmount}${currency}`,
          organizationName: context.organization.name,
          requestNumber: context.request.reqNumber,
          action: 'request_completed',
        })
      }
    } catch (error) {
      console.error('Failed to send quote acceptance email:', error)
    }
  }

  private async notifyQuoteRejected(
    quote: QuoteRecord,
    actorId: string,
    rejectionReason: string
  ): Promise<void> {
    try {
      const context = await this.loadNotificationContext(quote)
      if (!context) return

      const requester = await this.getUserById(actorId)
      const requesterName = requester?.name ?? context.request.requesterName
      const quoteNumber = this.getQuoteNumber(quote)

      if (context.request.conversationId) {
        await this.createSystemMessage({
          conversationId: context.request.conversationId,
          content: `Quote ${quoteNumber} has been rejected by ${requesterName}.\n\nReason: ${rejectionReason}`,
          senderId: actorId,
          metadata: {
            quoteId: quote.id,
            quoteNumber,
            eventType: 'quote_rejected',
            requestId: context.request.id,
            rejectionReason,
          },
        })
      }

      const admins = await this.getAdminsAndOwners(context.organization.id)
      for (const admin of admins) {
        await this.notifyRequestUpdate(admin.user.id, {
          requestId: context.request.id,
          lifecycleStatus: 'closed',
          closedReason: 'quote_rejected',
          details: `${requesterName} rejected quote ${quoteNumber}. Reason: ${rejectionReason}`,
          organizationName: context.organization.name,
          requestNumber: context.request.reqNumber,
          action: 'request_quoted',
        })
      }
    } catch (error) {
      console.error('Failed to send quote rejection notifications:', error)
    }
  }

  private async loadNotificationContext(
    quote: QuoteRecord
  ): Promise<QuoteNotificationContext | null> {
    const organizationId = this.getOrganizationId(quote)
    if (!organizationId) return null

    const [associatedRequest] = await db
      .select()
      .from(request)
      .where(eq(request.id, quote.requestId))
      .limit(1)

    if (!associatedRequest) return null

    const [quoteOrganization] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    if (!quoteOrganization) return null

    const requester = associatedRequest.requesterId
      ? await this.getUserById(associatedRequest.requesterId)
      : null

    return {
      request: associatedRequest,
      organization: quoteOrganization,
      requester,
    }
  }

  private async getUserById(userId: string): Promise<typeof user.$inferSelect | null> {
    const [foundUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1)
    return foundUser ?? null
  }

  private async getAdminsAndOwners(organizationId: string): Promise<OrganizationAdmin[]> {
    return await db
      .select({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(eq(member.organizationId, organizationId), inArray(member.role, ['admin', 'owner']))
      )
  }

  private async createSystemMessage(
    data: Parameters<typeof messageService.createSystemMessage>[0]
  ) {
    try {
      await messageService.createSystemMessage(data)
    } catch (error) {
      console.error('Failed to create system message for quote:', error)
    }
  }

  private async notifyRequestUpdate(
    userId: string,
    data: Parameters<typeof notificationApplicationService.notifyRequestUpdate>[1]
  ) {
    try {
      await notificationApplicationService.notifyRequestUpdate(userId, data)
    } catch (error) {
      console.error('Failed to send quote in-app notification:', error)
    }
  }

  private getOrganizationId(quote: QuoteRecord): string | null {
    return this.getString(quote.organizationId)
  }

  private getQuoteNumber(quote: QuoteRecord): string {
    return this.getString(quote.quoteNumber) ?? quote.id
  }

  private getString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  private getPricing(quote: QuoteRecord): QuotePricingSnapshot {
    return (quote.pricing ?? {}) as QuotePricingSnapshot
  }
}
