export interface DocumentUploadOptions {
  folder?: string
  allowedTypes?: string[]
  maxSize?: number
}

export interface UploadedDocument {
  url: string
  filename: string
  originalName: string
  size: number
  mimeType: string
}

export interface SignedDocumentUrl {
  originalUrl: string
  signedUrl: string
  filename: string
}

export interface RequestPdfData {
  id?: string
  reqNumber?: string
  requesterName?: string
  requesterEmail?: string
  receiverOrganizationId?: string
  categories?: string[]
  services?: string[]
  cargoDetails?: {
    weight?: number
    volume?: number
    dimensions?: {
      length?: number
      width?: number
      height?: number
    }
    palletCount?: number
    fragility?: string
  }
  comments?: string
  fromDate?: Date
  toDate?: Date
  lifecycleStatus?: string
  closedReason?: string | null
}

export interface RequestDocumentSource {
  id?: string
  reqNumber?: string | null
  requesterId?: string | null
  requester?: {
    name?: string | null
    email?: string | null
  } | null
  organization?: {
    name?: string | null
  } | null
  categories?: Array<string | { name?: string | null; slug?: string | null }> | null
  services?: Array<string | { name?: string | null; slug?: string | null }> | null
  cargoDetails?: {
    weight?: number | null
    volume?: number | null
    dimensions?: {
      length?: number | null
      width?: number | null
      height?: number | null
    } | null
    palletCount?: number | null
    fragility?: string | null
  } | null
  comments?: string | null
  fromDate?: Date | null
  toDate?: Date | null
  lifecycleStatus?: string | null
  closedReason?: string | null
  documents?: string[] | null
}

export interface UploadRequestDocumentsCommand {
  requestId: string
  actorId: string
  files: File[]
}

export interface ListRequestDocumentsCommand {
  requestId: string
  actorId: string
}

export interface DeleteRequestDocumentCommand {
  requestId: string
  actorId: string
  documentUrl: string
}

export interface GenerateRequestPdfCommand {
  requestId: string
  actorId: string
}

export interface GeneratedRequestPdf {
  buffer: Buffer
  filename: string
}
