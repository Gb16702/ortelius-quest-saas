import { documentFilenameFromUrl, validateDocumentFiles } from '../domain'
import type {
  DeleteRequestDocumentCommand,
  DocumentUploadOptions,
  GeneratedRequestPdf,
  GenerateRequestPdfCommand,
  ListRequestDocumentsCommand,
  RequestDocumentSource,
  RequestPdfData,
  SignedDocumentUrl,
  UploadedDocument,
  UploadRequestDocumentsCommand,
} from './document-models'
import type {
  DocumentRepositoryPort,
  PdfGeneratorPort,
  RequestDocumentAuthorizationPort,
  RequestDocumentSourcePort,
} from './ports'

export class RequestDocumentNotFoundError extends Error {
  constructor() {
    super('Request not found')
    this.name = 'RequestDocumentNotFoundError'
  }
}

export class RequestDocumentForbiddenError extends Error {
  constructor(action: 'upload' | 'view' | 'delete') {
    const messages = {
      upload: 'Not authorized to upload documents for this request',
      view: 'Not authorized to view documents for this request',
      delete: 'Not authorized to delete documents from this request',
    }
    super(messages[action])
    this.name = 'RequestDocumentForbiddenError'
  }
}

export class UploadDocumentsUseCase {
  constructor(private readonly documents: DocumentRepositoryPort) {}

  async execute(command: {
    files: File[]
    options?: DocumentUploadOptions
  }): Promise<UploadedDocument[]> {
    if (!command.files || command.files.length === 0) {
      return []
    }

    validateDocumentFiles(command.files, command.options)
    return await this.documents.uploadDocuments(command.files, command.options)
  }
}

export class UploadRequestDocumentsUseCase {
  constructor(
    private readonly documents: DocumentRepositoryPort,
    private readonly requests: RequestDocumentSourcePort
  ) {}

  async execute(command: UploadRequestDocumentsCommand): Promise<string[]> {
    const request = await this.getAuthorizedRequest(command.requestId, command.actorId)
    return await this.documents.uploadRequestDocuments(
      request.id || command.requestId,
      command.files
    )
  }

  private async getAuthorizedRequest(
    requestId: string,
    actorId: string
  ): Promise<RequestDocumentSource> {
    const request = await this.requests.getRequestById(requestId)
    if (!request) {
      throw new RequestDocumentNotFoundError()
    }

    if (request.requesterId !== actorId) {
      throw new RequestDocumentForbiddenError('upload')
    }

    return request
  }
}

export class ListRequestDocumentsUseCase {
  constructor(
    private readonly documents: DocumentRepositoryPort,
    private readonly requests: RequestDocumentSourcePort
  ) {}

  async execute(command: ListRequestDocumentsCommand): Promise<SignedDocumentUrl[]> {
    const request = await this.requests.getRequestById(command.requestId)
    if (!request) {
      throw new RequestDocumentNotFoundError()
    }

    if (request.requesterId !== command.actorId) {
      throw new RequestDocumentForbiddenError('view')
    }

    return await this.documents.generateSignedUrls(request.documents || [])
  }
}

export class DeleteRequestDocumentUseCase {
  constructor(private readonly requests: RequestDocumentSourcePort) {}

  async execute(command: DeleteRequestDocumentCommand): Promise<string[]> {
    const request = await this.requests.getRequestById(command.requestId)
    if (!request) {
      throw new RequestDocumentNotFoundError()
    }

    if (request.requesterId !== command.actorId) {
      throw new RequestDocumentForbiddenError('delete')
    }

    await this.requests.removeDocumentFromRequest(command.requestId, command.documentUrl)

    const updatedRequest = await this.requests.getRequestById(command.requestId)
    return updatedRequest?.documents || []
  }
}

export class GenerateRequestPdfUseCase {
  constructor(
    private readonly pdf: PdfGeneratorPort,
    private readonly requests: RequestDocumentSourcePort,
    private readonly authorization: RequestDocumentAuthorizationPort
  ) {}

  async execute(command: GenerateRequestPdfCommand): Promise<GeneratedRequestPdf> {
    const accessibleRequestId =
      (await this.authorization.resolveAccessibleRequestById(command.requestId, command.actorId)) ||
      (await this.authorization.resolveAccessibleRequestByNumber(
        command.requestId,
        command.actorId
      ))

    if (!accessibleRequestId) {
      throw new RequestDocumentNotFoundError()
    }

    const request = await this.requests.getRequestById(accessibleRequestId)

    if (!request) {
      throw new RequestDocumentNotFoundError()
    }

    const requestData = mapRequestToPdfData(request)
    const buffer = await this.pdf.generateRequestPdf(requestData)

    return {
      buffer,
      filename: `${requestData.reqNumber || `request-${command.requestId}`}.pdf`,
    }
  }
}

export function mapRequestToPdfData(request: RequestDocumentSource): RequestPdfData {
  return {
    id: request.id,
    reqNumber: request.reqNumber || undefined,
    requesterName: request.requester?.name || undefined,
    requesterEmail: request.requester?.email || undefined,
    receiverOrganizationId: request.organization?.name || undefined,
    categories: mapNamedValues(request.categories),
    services: mapNamedValues(request.services),
    cargoDetails: request.cargoDetails
      ? {
          weight: request.cargoDetails.weight || undefined,
          volume: request.cargoDetails.volume || undefined,
          dimensions: request.cargoDetails.dimensions
            ? {
                length: request.cargoDetails.dimensions.length || undefined,
                width: request.cargoDetails.dimensions.width || undefined,
                height: request.cargoDetails.dimensions.height || undefined,
              }
            : undefined,
          palletCount: request.cargoDetails.palletCount || undefined,
          fragility: request.cargoDetails.fragility || undefined,
        }
      : undefined,
    comments: request.comments || undefined,
    fromDate: request.fromDate || undefined,
    toDate: request.toDate || undefined,
    lifecycleStatus: request.lifecycleStatus || 'open',
    closedReason: request.closedReason || null,
  }
}

function mapNamedValues(
  values: Array<string | { name?: string | null; slug?: string | null }> | null | undefined
): string[] {
  return (
    values?.map((value) => {
      if (typeof value === 'string') {
        return value
      }
      return value.name || value.slug || ''
    }) || []
  )
}

export function mapSignedUrls(documentUrls: string[], signedUrls: string[]): SignedDocumentUrl[] {
  return documentUrls.map((url, index) => ({
    originalUrl: url,
    signedUrl: signedUrls[index] || '',
    filename: documentFilenameFromUrl(url),
  }))
}
