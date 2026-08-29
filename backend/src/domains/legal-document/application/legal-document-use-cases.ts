import {
  buildLegalDocumentStorageKey,
  calculateLegalDocumentQuota,
  LEGAL_DOC_MAX_FILE_BYTES,
  LEGAL_DOC_MAX_FILES_PER_REQUEST,
  LEGAL_DOC_MIME_TYPE,
  legalDocumentUploadExceedsQuota,
  resolveLegalDocumentLabel,
  sanitizeLegalDocumentFilename,
  validateLegalDocumentFileShape,
} from '../domain'
import {
  LegalDocumentNotFoundError,
  LegalDocumentQuotaExceededError,
  LegalDocumentValidationError,
} from './legal-document-errors'
import type {
  DownloadLegalDocumentUrl,
  LegalDocument,
  LegalDocumentQuoteSnapshot,
  UploadLegalDocumentsCommand,
} from './legal-document-models'
import { legalDocumentRowToDto } from './legal-document-models'
import type {
  LegalDocumentClockPort,
  LegalDocumentIdPort,
  LegalDocumentMimeDetectorPort,
  LegalDocumentRepositoryPort,
  LegalDocumentStoragePort,
} from './ports'

const DOWNLOAD_URL_EXPIRES_IN_SECONDS = 60 * 60

export class ListLegalDocumentsUseCase {
  constructor(private readonly documents: LegalDocumentRepositoryPort) {}

  execute(command: { organizationId: string }) {
    return this.documents.listForOrganization(command.organizationId)
  }
}

export class GenerateLegalDocumentDownloadUrlUseCase {
  constructor(
    private readonly documents: LegalDocumentRepositoryPort,
    private readonly storage: LegalDocumentStoragePort,
    private readonly clock: LegalDocumentClockPort
  ) {}

  async execute(command: {
    documentId: string
    organizationId: string
  }): Promise<DownloadLegalDocumentUrl> {
    const row = await this.documents.getById(command.documentId, command.organizationId)
    if (!row) {
      throw new LegalDocumentNotFoundError()
    }

    const url = await this.storage.getDownloadUrl(
      row.s3Key,
      DOWNLOAD_URL_EXPIRES_IN_SECONDS,
      row.originalFilename
    )
    const expiresAt = new Date(
      this.clock.now().getTime() + DOWNLOAD_URL_EXPIRES_IN_SECONDS * 1000
    ).toISOString()

    return { url, expiresAt }
  }
}

export class UploadLegalDocumentsUseCase {
  constructor(
    private readonly documents: LegalDocumentRepositoryPort,
    private readonly storage: LegalDocumentStoragePort,
    private readonly mimeDetector: LegalDocumentMimeDetectorPort,
    private readonly ids: LegalDocumentIdPort
  ) {}

  async execute(command: UploadLegalDocumentsCommand): Promise<{ documents: LegalDocument[] }> {
    if (command.files.length === 0) {
      throw new LegalDocumentValidationError('No files provided')
    }

    if (command.files.length > LEGAL_DOC_MAX_FILES_PER_REQUEST) {
      throw new LegalDocumentValidationError(
        `Maximum ${LEGAL_DOC_MAX_FILES_PER_REQUEST} files allowed per upload`
      )
    }

    const existingTotal = await this.documents.getCumulativeSize(command.organizationId)
    const incomingTotal = command.files.reduce((acc, file) => acc + file.size, 0)
    const quota = calculateLegalDocumentQuota(existingTotal, incomingTotal)
    if (legalDocumentUploadExceedsQuota(quota)) {
      throw new LegalDocumentQuotaExceededError(quota)
    }

    const created: LegalDocument[] = []

    for (const [index, file] of command.files.entries()) {
      const shapeFailure = validateLegalDocumentFileShape(file)
      if (shapeFailure) {
        throw new LegalDocumentValidationError(
          shapeFailure.reason,
          file.size > LEGAL_DOC_MAX_FILE_BYTES ? 413 : 400
        )
      }

      const data = new Uint8Array(await file.arrayBuffer())
      const detected = await this.mimeDetector.detectMime(data)
      if (!detected || detected.mime !== LEGAL_DOC_MIME_TYPE) {
        throw new LegalDocumentValidationError(
          `File ${file.name} is not a valid PDF (magic bytes mismatch)`
        )
      }

      const sanitized = sanitizeLegalDocumentFilename(file.name)
      if (!sanitized.ok) {
        throw new LegalDocumentValidationError(`File ${file.name}: ${sanitized.reason}`)
      }

      const label = resolveLegalDocumentLabel(command.metadata[index]?.label, sanitized.baseLabel)
      const documentId = this.ids.newId()
      const s3Key = buildLegalDocumentStorageKey(command.organizationId, documentId)

      await this.storage.uploadBuffer({
        key: s3Key,
        data,
        contentType: LEGAL_DOC_MIME_TYPE,
        metadata: {
          orgId: command.organizationId,
          uploadedById: command.uploadedById,
        },
      })

      const inserted = await this.documents.insert({
        organizationId: command.organizationId,
        label,
        s3Key,
        sizeBytes: file.size,
        originalFilename: sanitized.filename,
        uploadedById: command.uploadedById,
      })
      created.push(legalDocumentRowToDto(inserted))
    }

    return { documents: created }
  }
}

export class UpdateLegalDocumentLabelUseCase {
  constructor(private readonly documents: LegalDocumentRepositoryPort) {}

  async execute(command: {
    documentId: string
    organizationId: string
    label: string
  }): Promise<LegalDocument> {
    if (!command.label) {
      throw new LegalDocumentValidationError('label is required')
    }

    const updated = await this.documents.updateLabel(
      command.documentId,
      command.organizationId,
      command.label
    )
    if (!updated) {
      throw new LegalDocumentNotFoundError()
    }

    return legalDocumentRowToDto(updated)
  }
}

export class DeleteLegalDocumentUseCase {
  constructor(private readonly documents: LegalDocumentRepositoryPort) {}

  async execute(command: { documentId: string; organizationId: string }): Promise<void> {
    const { deleted } = await this.documents.deleteById(command.documentId, command.organizationId)
    if (!deleted) {
      throw new LegalDocumentNotFoundError()
    }
  }
}

export class GetActiveLegalDocumentsForQuoteUseCase {
  constructor(private readonly documents: LegalDocumentRepositoryPort) {}

  execute(command: {
    documentIds: string[]
    organizationId: string
  }): Promise<LegalDocumentQuoteSnapshot[]> {
    return this.documents.getActiveByIdsForOrg(command.documentIds, command.organizationId)
  }
}
