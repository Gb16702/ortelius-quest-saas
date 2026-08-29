import type {
  LegalDocument,
  LegalDocumentQuoteSnapshot,
  LegalDocumentRow,
} from './legal-document-models'

export interface LegalDocumentRepositoryPort {
  listForOrganization(organizationId: string): Promise<{
    documents: LegalDocument[]
    totalSizeBytes: number
  }>
  getById(documentId: string, organizationId: string): Promise<LegalDocumentRow | null>
  getCumulativeSize(organizationId: string): Promise<number>
  insert(input: {
    organizationId: string
    label: string
    s3Key: string
    sizeBytes: number
    originalFilename: string
    uploadedById: string
  }): Promise<LegalDocumentRow>
  updateLabel(
    documentId: string,
    organizationId: string,
    label: string
  ): Promise<LegalDocumentRow | null>
  deleteById(documentId: string, organizationId: string): Promise<{ deleted: boolean }>
  getActiveByIdsForOrg(
    documentIds: string[],
    organizationId: string
  ): Promise<LegalDocumentQuoteSnapshot[]>
  countActiveForOrganization(organizationId: string): Promise<number>
}

export interface LegalDocumentStoragePort {
  uploadBuffer(input: {
    key: string
    data: Uint8Array
    contentType: 'application/pdf'
    metadata: Record<string, string>
  }): Promise<void>
  getDownloadUrl(key: string, expiresInSeconds: number, filename: string): Promise<string>
}

export interface LegalDocumentMimeDetectorPort {
  detectMime(data: Uint8Array): Promise<{ mime: string } | null>
}

export interface LegalDocumentIdPort {
  newId(): string
}

export interface LegalDocumentClockPort {
  now(): Date
}
