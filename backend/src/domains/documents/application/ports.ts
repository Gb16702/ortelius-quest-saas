import type {
  DocumentUploadOptions,
  RequestDocumentSource,
  RequestPdfData,
  SignedDocumentUrl,
  UploadedDocument,
} from './document-models'

export interface DocumentRepositoryPort {
  uploadDocument(file: File, options?: DocumentUploadOptions): Promise<UploadedDocument>
  uploadDocuments(files: File[], options?: DocumentUploadOptions): Promise<UploadedDocument[]>
  uploadRequestDocuments(requestId: string, files: File[]): Promise<string[]>
  deleteDocument(documentUrl: string): Promise<void>
  deleteDocuments(documentUrls: string[]): Promise<void>
  generateSignedUrl(documentUrl: string, expiresIn?: number, filename?: string): Promise<string>
  generateSignedUrls(documentUrls: string[], expiresIn?: number): Promise<SignedDocumentUrl[]>
}

export interface PdfGeneratorPort {
  generateRequestPdf(requestData: RequestPdfData): Promise<Buffer>
  generateRequestPdfStream(requestData: RequestPdfData): NodeJS.ReadableStream
}

export interface RequestDocumentSourcePort {
  getRequestById(requestId: string): Promise<RequestDocumentSource | null>
  getRequestByNumber(requestNumber: string): Promise<RequestDocumentSource | null>
  removeDocumentFromRequest(requestId: string, documentUrl: string): Promise<void>
}

export interface RequestDocumentAuthorizationPort {
  resolveAccessibleRequestById(requestId: string, userId: string): Promise<string | null>
  resolveAccessibleRequestByNumber(requestNumber: string, userId: string): Promise<string | null>
}
