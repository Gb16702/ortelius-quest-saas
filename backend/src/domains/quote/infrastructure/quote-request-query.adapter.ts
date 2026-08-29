import { requestsApplicationService } from '../../requests/requests.application'
import type { QuoteRequestQueryPort, QuoteRequestSummary } from '../application/ports'

export class QuoteRequestQueryAdapter implements QuoteRequestQueryPort {
  async getRequestById(requestId: string): Promise<QuoteRequestSummary | null> {
    const request = await requestsApplicationService.getRequestById(requestId)
    return request ? { id: request.id, reqNumber: request.reqNumber } : null
  }
}
