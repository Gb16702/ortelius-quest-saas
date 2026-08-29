import { activityApplicationService } from '../../activity/activity.application'
import type { QuoteActivityPort } from '../application/ports'

export class QuoteActivityAdapter implements QuoteActivityPort {
  async logQuoteEvent(data: Parameters<QuoteActivityPort['logQuoteEvent']>[0]): Promise<void> {
    const action = data.eventType.replace('quote-', '')
    const description = data.reqNumber
      ? `${action} quote for request ${data.reqNumber}`
      : `${action} quote`

    await activityApplicationService.logEvent({
      organizationId: data.organizationId,
      actorId: data.actorId,
      eventType: data.eventType,
      description,
      metadata: {
        quoteId: data.quoteId,
        requestId: data.requestId,
        reqNumber: data.reqNumber,
      },
    })
  }
}
