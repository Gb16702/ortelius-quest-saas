import { RequestAuthorizationAdapter } from '../../requests/infrastructure/request-authorization.adapter'
import {
  DeleteRequestDocumentUseCase,
  GenerateRequestPdfUseCase,
  ListRequestDocumentsUseCase,
  UploadDocumentsUseCase,
  UploadRequestDocumentsUseCase,
} from '../application/document-use-cases'
import { S3DocumentRepository } from './document.repository'
import { PdfKitGeneratorAdapter } from './pdf-generator.adapter'
import { RequestRepositoryDocumentSourceAdapter } from './request-document-source.adapter'

let documentUseCases: {
  uploadDocuments: UploadDocumentsUseCase
  uploadRequestDocuments: UploadRequestDocumentsUseCase
  listRequestDocuments: ListRequestDocumentsUseCase
  deleteRequestDocument: DeleteRequestDocumentUseCase
  generateRequestPdf: GenerateRequestPdfUseCase
} | null = null

export async function getDocumentUseCases() {
  if (!documentUseCases) {
    const documents = new S3DocumentRepository()
    const requests = new RequestRepositoryDocumentSourceAdapter()
    const authorization = new RequestAuthorizationAdapter()
    const pdf = new PdfKitGeneratorAdapter()

    documentUseCases = {
      uploadDocuments: new UploadDocumentsUseCase(documents),
      uploadRequestDocuments: new UploadRequestDocumentsUseCase(documents, requests),
      listRequestDocuments: new ListRequestDocumentsUseCase(documents, requests),
      deleteRequestDocument: new DeleteRequestDocumentUseCase(requests),
      generateRequestPdf: new GenerateRequestPdfUseCase(pdf, requests, authorization),
    }
  }

  return documentUseCases
}
