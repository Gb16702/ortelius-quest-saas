import { DrizzleRequestRepository } from '../../requests/infrastructure/drizzle-request.repository'
import type { RequestDocumentSource } from '../application/document-models'
import type { RequestDocumentSourcePort } from '../application/ports'

export class RequestRepositoryDocumentSourceAdapter implements RequestDocumentSourcePort {
  private readonly requests = new DrizzleRequestRepository()

  async getRequestById(requestId: string): Promise<RequestDocumentSource | null> {
    return await this.requests.getByIdWithRelations(requestId)
  }

  async getRequestByNumber(requestNumber: string): Promise<RequestDocumentSource | null> {
    return await this.requests.getByNumber(requestNumber)
  }

  async removeDocumentFromRequest(requestId: string, documentUrl: string): Promise<void> {
    await this.requests.removeDocument(requestId, documentUrl)
  }
}
