export type LegalDocumentScanStatus = 'pending' | 'clean' | 'infected' | 'error'

export interface LegalDocument {
  id: string
  organizationId: string
  label: string
  sizeBytes: number
  mimeType: 'application/pdf'
  originalFilename: string
  scanStatus: LegalDocumentScanStatus
  uploadedById: string
  uploadedByName: string | null
  createdAt: string
  updatedAt: string
}

export interface LegalDocumentRow {
  id: string
  organizationId: string
  label: string
  s3Key: string
  sizeBytes: number
  mimeType: string
  originalFilename: string
  scanStatus: LegalDocumentScanStatus
  scanCompletedAt: Date | null
  uploadedById: string
  uploadedByName: string | null
  createdAt: Date
  updatedAt: Date
}

export interface LegalDocumentQuoteSnapshot {
  id: string
  label: string
  originalFilename: string
  sizeBytes: number
  s3Key: string
}

export interface LegalDocumentUploadFile {
  name: string
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface LegalDocumentUploadMetadata {
  label?: string
}

export interface UploadLegalDocumentsCommand {
  organizationId: string
  uploadedById: string
  files: LegalDocumentUploadFile[]
  metadata: LegalDocumentUploadMetadata[]
}

export interface DownloadLegalDocumentUrl {
  url: string
  expiresAt: string
}

export function legalDocumentRowToDto(row: LegalDocumentRow): LegalDocument {
  return {
    id: row.id,
    organizationId: row.organizationId,
    label: row.label,
    sizeBytes: row.sizeBytes,
    mimeType: 'application/pdf',
    originalFilename: row.originalFilename,
    scanStatus: row.scanStatus,
    uploadedById: row.uploadedById,
    uploadedByName: row.uploadedByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
