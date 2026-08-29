import { eq } from 'drizzle-orm'
import { EmailService } from '../../../../emails/services/email.service'
import { EmailTemplate } from '../../../../emails/types'
import { buildAuthLink } from '../../../infrastructure/auth/auth-link'
import { db } from '../../../infrastructure/database'
import { organization, user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { quote } from '../../../infrastructure/database/db/schemas/quote-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'
import { messageApplicationService as messageService } from '../../messaging/message/message.application'
import { metricsApplicationService as metricsService } from '../../metrics/metrics.application'
import { memberMetricsService } from '../../metrics/services/member-metrics.service'
import type { Invoice } from '../application/invoice-models'
import type { InvoiceLifecycleSideEffectsPort } from '../application/ports'

export class InvoiceLifecycleSideEffectsAdapter implements InvoiceLifecycleSideEffectsPort {
  async afterInvoiceCreated(input: { invoice: Invoice; actorId: string }): Promise<void> {
    await this.updateInvoiceMetrics(input.invoice, input.actorId)

    const [requestData] = await db
      .select()
      .from(request)
      .where(eq(request.id, input.invoice.requestId))
      .limit(1)

    if (!requestData?.conversationId) {
      return
    }

    const [quoteData] = await db
      .select()
      .from(quote)
      .where(eq(quote.id, input.invoice.quoteId))
      .limit(1)

    if (!quoteData) {
      return
    }

    try {
      await messageService.createSystemMessage({
        conversationId: requestData.conversationId,
        content: `Invoice ${input.invoice.invoiceNumber} has been created for quote ${quoteData.quoteNumber}`,
        senderId: 'system',
        metadata: {
          invoiceId: input.invoice.id,
          invoiceNumber: input.invoice.invoiceNumber,
          quoteId: quoteData.id,
          quoteNumber: quoteData.quoteNumber,
          requestId: quoteData.requestId,
          requestNumber: requestData.reqNumber,
          eventType: 'invoice_created',
          organizationId: quoteData.organizationId,
        },
      })
    } catch (_error) {}
  }

  async afterInvoiceSent(input: { invoice: Invoice; actorId: string }): Promise<void> {
    const [requestData] = await db
      .select()
      .from(request)
      .where(eq(request.id, input.invoice.requestId))
      .limit(1)

    if (!requestData) {
      return
    }

    if (requestData.conversationId) {
      try {
        await messageService.createSystemMessage({
          conversationId: requestData.conversationId,
          content: `Invoice ${input.invoice.invoiceNumber} has been sent`,
          senderId: 'system',
          metadata: {
            invoiceId: input.invoice.id,
            invoiceNumber: input.invoice.invoiceNumber,
            requestId: input.invoice.requestId,
            requestNumber: requestData.reqNumber,
            eventType: 'invoice_sent',
            organizationId: input.invoice.organizationId,
          },
        })
      } catch (_error) {}
    }

    await this.sendInvoiceEmail(input.invoice, requestData)
  }

  private async updateInvoiceMetrics(invoice: Invoice, actorId: string): Promise<void> {
    try {
      await metricsService.incrementInvoiceMetric(
        invoice.organizationId,
        invoice.pricing.totalAmount
      )
      await memberMetricsService.incrementMemberInvoice(
        actorId,
        invoice.organizationId,
        invoice.pricing.totalAmount
      )
    } catch (error) {
      console.error('Failed to update metrics for invoice:', error)
    }
  }

  private async sendInvoiceEmail(
    invoice: Invoice,
    requestData: typeof request.$inferSelect
  ): Promise<void> {
    try {
      let requester = null as typeof user.$inferSelect | null | undefined
      if (requestData.requesterId) {
        const [userRequester] = await db
          .select()
          .from(user)
          .where(eq(user.id, requestData.requesterId))
          .limit(1)
        requester = userRequester
      }

      const [invoiceOrganization] = await db
        .select()
        .from(organization)
        .where(eq(organization.id, invoice.organizationId))
        .limit(1)

      if (!invoiceOrganization) {
        return
      }

      const requesterName = requester?.name || requestData.requesterName
      const requesterEmail = requester?.email || requestData.requesterEmail

      await EmailService.sendTemplatedEmail(
        EmailTemplate.INVOICE_SENT,
        {
          username: requesterName,
          invoiceNumber: invoice.invoiceNumber,
          organizationName: invoiceOrganization.name,
          totalAmount: invoice.pricing.totalAmount.toString(),
          currency: invoice.pricing.currency || 'EUR',
          dueDate: invoice.dueDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          dashboardLink: buildAuthLink({
            email: requesterEmail,
            redirectPath: requestData.requesterId
              ? `/dashboard/requests/${requestData.id}/invoices/${invoice.id}`
              : `/request/${requestData.id}/invoices/${invoice.id}`,
          }),
        },
        {
          to: requesterEmail,
          subject: `Invoice Received - ${invoice.invoiceNumber}`,
        }
      )
    } catch (_error) {
      console.error('Failed to send invoice email:', _error)
    }
  }
}
