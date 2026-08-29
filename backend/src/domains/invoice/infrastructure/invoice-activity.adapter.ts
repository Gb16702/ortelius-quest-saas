import { activityApplicationService } from '../../activity/activity.application'
import type { InvoiceActivityPort } from '../application/ports'

export class ActivityInvoiceAdapter implements InvoiceActivityPort {
  async logInvoiceCreated(input: {
    organizationId: string
    actorId: string
    invoiceId: string
    requestId: string
    reqNumber?: string
  }): Promise<void> {
    await activityApplicationService.logEvent({
      organizationId: input.organizationId,
      actorId: input.actorId,
      eventType: 'invoice-created',
      description: input.reqNumber
        ? `created invoice for request ${input.reqNumber}`
        : 'created invoice',
      metadata: {
        invoiceId: input.invoiceId,
        requestId: input.requestId,
        reqNumber: input.reqNumber,
      },
    })
  }

  async logInvoiceSent(input: {
    organizationId: string
    actorId: string
    invoiceId: string
    requestId: string
    reqNumber?: string
  }): Promise<void> {
    await activityApplicationService.logEvent({
      organizationId: input.organizationId,
      actorId: input.actorId,
      eventType: 'invoice-sent',
      description: input.reqNumber ? `sent invoice for request ${input.reqNumber}` : 'sent invoice',
      metadata: {
        invoiceId: input.invoiceId,
        requestId: input.requestId,
        reqNumber: input.reqNumber,
      },
    })
  }
}
