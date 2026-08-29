import { requestsApplicationService } from '../../requests/requests.application'
import type { InvoiceRequestLookupPort } from '../application/ports'

export class RequestsInvoiceLookupAdapter implements InvoiceRequestLookupPort {
  async getRequestNumber(requestId: string): Promise<string | undefined> {
    const request = await requestsApplicationService.getRequestById(requestId)
    return request?.reqNumber
  }
}
