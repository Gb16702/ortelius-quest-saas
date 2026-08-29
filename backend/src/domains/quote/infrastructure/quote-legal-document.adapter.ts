import { legalDocumentApplicationService } from '../../legal-document/legal-document.application'
import type { QuoteLegalDocumentPort, QuoteLegalDocumentSnapshot } from '../application/ports'

export class QuoteLegalDocumentAdapter implements QuoteLegalDocumentPort {
  async getActiveByIdsForOrg(
    documentIds: string[],
    organizationId: string
  ): Promise<QuoteLegalDocumentSnapshot[]> {
    return await legalDocumentApplicationService.getActiveByIdsForOrg(documentIds, organizationId)
  }
}
