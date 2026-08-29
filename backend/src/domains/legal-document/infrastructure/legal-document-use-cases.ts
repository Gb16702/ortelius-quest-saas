import {
  DeleteLegalDocumentUseCase,
  GenerateLegalDocumentDownloadUrlUseCase,
  GetActiveLegalDocumentsForQuoteUseCase,
  ListLegalDocumentsUseCase,
  UpdateLegalDocumentLabelUseCase,
  UploadLegalDocumentsUseCase,
} from '../application/legal-document-use-cases'
import { legalDocumentRepository } from './legal-document.repository'
import { FileTypeLegalDocumentMimeDetector } from './legal-document-mime.adapter'
import { S3LegalDocumentStorageAdapter } from './legal-document-storage.adapter'
import {
  SystemLegalDocumentClock,
  UuidLegalDocumentIdAdapter,
} from './legal-document-system.adapter'

let legalDocumentUseCases: {
  list: ListLegalDocumentsUseCase
  downloadUrl: GenerateLegalDocumentDownloadUrlUseCase
  upload: UploadLegalDocumentsUseCase
  updateLabel: UpdateLegalDocumentLabelUseCase
  delete: DeleteLegalDocumentUseCase
  getActiveForQuote: GetActiveLegalDocumentsForQuoteUseCase
} | null = null

export async function getLegalDocumentUseCases() {
  if (!legalDocumentUseCases) {
    const storage = new S3LegalDocumentStorageAdapter()
    const mimeDetector = new FileTypeLegalDocumentMimeDetector()
    const ids = new UuidLegalDocumentIdAdapter()
    const clock = new SystemLegalDocumentClock()

    legalDocumentUseCases = {
      list: new ListLegalDocumentsUseCase(legalDocumentRepository),
      downloadUrl: new GenerateLegalDocumentDownloadUrlUseCase(
        legalDocumentRepository,
        storage,
        clock
      ),
      upload: new UploadLegalDocumentsUseCase(legalDocumentRepository, storage, mimeDetector, ids),
      updateLabel: new UpdateLegalDocumentLabelUseCase(legalDocumentRepository),
      delete: new DeleteLegalDocumentUseCase(legalDocumentRepository),
      getActiveForQuote: new GetActiveLegalDocumentsForQuoteUseCase(legalDocumentRepository),
    }
  }

  return legalDocumentUseCases
}
