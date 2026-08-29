import type {
  DeleteRequestDocumentCommand,
  DocumentUploadOptions,
  GeneratedRequestPdf,
  GenerateRequestPdfCommand,
  ListRequestDocumentsCommand,
  SignedDocumentUrl,
  UploadedDocument,
  UploadRequestDocumentsCommand,
} from './application/document-models'
import { S3DocumentRepository } from './infrastructure/document.repository'
import { getDocumentUseCases } from './infrastructure/document-use-cases'
import { PdfKitGeneratorAdapter } from './infrastructure/pdf-generator.adapter'

export class DocumentsApplicationService {
  private readonly documentRepository = new S3DocumentRepository()
  private readonly pdfGenerator = new PdfKitGeneratorAdapter()

  async uploadDocument(file: File, options: DocumentUploadOptions = {}): Promise<UploadedDocument> {
    return await this.documentRepository.uploadDocument(file, options)
  }

  async uploadDocuments(
    files: File[],
    options: DocumentUploadOptions = {}
  ): Promise<UploadedDocument[]> {
    const useCases = await getDocumentUseCases()
    return await useCases.uploadDocuments.execute({ files, options })
  }

  async uploadRequestDocuments(requestId: string, files: File[]): Promise<string[]> {
    return await this.documentRepository.uploadRequestDocuments(requestId, files)
  }

  async uploadDocumentsForRequest(command: UploadRequestDocumentsCommand): Promise<string[]> {
    const useCases = await getDocumentUseCases()
    return await useCases.uploadRequestDocuments.execute(command)
  }

  async listRequestDocuments(command: ListRequestDocumentsCommand): Promise<SignedDocumentUrl[]> {
    const useCases = await getDocumentUseCases()
    return await useCases.listRequestDocuments.execute(command)
  }

  async deleteRequestDocument(command: DeleteRequestDocumentCommand): Promise<string[]> {
    const useCases = await getDocumentUseCases()
    return await useCases.deleteRequestDocument.execute(command)
  }

  async deleteDocument(documentUrl: string): Promise<void> {
    await this.documentRepository.deleteDocument(documentUrl)
  }

  async deleteDocuments(documentUrls: string[]): Promise<void> {
    await this.documentRepository.deleteDocuments(documentUrls)
  }

  async generateSignedUrl(
    documentUrl: string,
    expiresIn = 3600,
    filename?: string
  ): Promise<string> {
    return await this.documentRepository.generateSignedUrl(documentUrl, expiresIn, filename)
  }

  async generateSignedUrls(documentUrls: string[], expiresIn = 3600): Promise<SignedDocumentUrl[]> {
    return await this.documentRepository.generateSignedUrls(documentUrls, expiresIn)
  }

  async generateRequestPdf(command: GenerateRequestPdfCommand): Promise<GeneratedRequestPdf> {
    const useCases = await getDocumentUseCases()
    return await useCases.generateRequestPdf.execute(command)
  }

  async generateRequestPdfBuffer(
    requestData: Parameters<PdfKitGeneratorAdapter['generateRequestPdf']>[0]
  ) {
    return await this.pdfGenerator.generateRequestPdf(requestData)
  }

  generateRequestPdfStream(
    requestData: Parameters<PdfKitGeneratorAdapter['generateRequestPdfStream']>[0]
  ): NodeJS.ReadableStream {
    return this.pdfGenerator.generateRequestPdfStream(requestData)
  }
}

export const documentsApplicationService = new DocumentsApplicationService()
