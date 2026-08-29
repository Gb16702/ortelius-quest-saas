import type {
  DownloadLegalDocumentUrl,
  LegalDocument,
  LegalDocumentQuoteSnapshot,
  LegalDocumentUploadFile,
  LegalDocumentUploadMetadata,
} from './application/legal-document-models'
import { getLegalDocumentUseCases } from './infrastructure/legal-document-use-cases'

export class LegalDocumentApplicationService {
  async listForOrganization(organizationId: string): Promise<{
    documents: LegalDocument[]
    totalSizeBytes: number
  }> {
    const useCases = await getLegalDocumentUseCases()
    return useCases.list.execute({ organizationId })
  }

  async generateDownloadUrl(
    documentId: string,
    organizationId: string
  ): Promise<DownloadLegalDocumentUrl> {
    const useCases = await getLegalDocumentUseCases()
    return useCases.downloadUrl.execute({ documentId, organizationId })
  }

  async upload(input: {
    organizationId: string
    uploadedById: string
    files: LegalDocumentUploadFile[]
    metadata: LegalDocumentUploadMetadata[]
  }): Promise<{ documents: LegalDocument[] }> {
    const useCases = await getLegalDocumentUseCases()
    return useCases.upload.execute(input)
  }

  async updateLabel(
    documentId: string,
    organizationId: string,
    label: string
  ): Promise<LegalDocument> {
    const useCases = await getLegalDocumentUseCases()
    return useCases.updateLabel.execute({ documentId, organizationId, label })
  }

  async deleteById(documentId: string, organizationId: string): Promise<void> {
    const useCases = await getLegalDocumentUseCases()
    return useCases.delete.execute({ documentId, organizationId })
  }

  async getActiveByIdsForOrg(
    documentIds: string[],
    organizationId: string
  ): Promise<LegalDocumentQuoteSnapshot[]> {
    const useCases = await getLegalDocumentUseCases()
    return useCases.getActiveForQuote.execute({ documentIds, organizationId })
  }
}

export const legalDocumentApplicationService = new LegalDocumentApplicationService()
