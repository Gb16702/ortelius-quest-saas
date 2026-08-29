import { describe, expect, it, mock } from 'bun:test'
import {
  LegalDocumentNotFoundError,
  LegalDocumentQuotaExceededError,
  LegalDocumentValidationError,
} from '../application/legal-document-errors'
import type {
  LegalDocumentRow,
  LegalDocumentUploadFile,
} from '../application/legal-document-models'
import {
  DeleteLegalDocumentUseCase,
  GenerateLegalDocumentDownloadUrlUseCase,
  UpdateLegalDocumentLabelUseCase,
  UploadLegalDocumentsUseCase,
} from '../application/legal-document-use-cases'
import type {
  LegalDocumentClockPort,
  LegalDocumentIdPort,
  LegalDocumentMimeDetectorPort,
  LegalDocumentRepositoryPort,
  LegalDocumentStoragePort,
} from '../application/ports'
import { LEGAL_DOC_QUOTA_BYTES } from '../domain'

function makeRow(overrides: Partial<LegalDocumentRow> = {}): LegalDocumentRow {
  return {
    id: 'doc-1',
    organizationId: 'org-1',
    label: 'Contract',
    s3Key: 'legal-documents/org-1/doc-1.pdf',
    sizeBytes: 12,
    mimeType: 'application/pdf',
    originalFilename: 'Contract.pdf',
    scanStatus: 'clean',
    scanCompletedAt: null,
    uploadedById: 'user-1',
    uploadedByName: 'Ada Lovelace',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  }
}

function makeFile(overrides: Partial<LegalDocumentUploadFile> = {}): LegalDocumentUploadFile {
  return {
    name: 'Contract.pdf',
    type: 'application/pdf',
    size: 12,
    arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
    ...overrides,
  }
}

function makeRepository(
  overrides: Partial<LegalDocumentRepositoryPort> = {}
): LegalDocumentRepositoryPort {
  return {
    listForOrganization: mock(async () => ({ documents: [], totalSizeBytes: 0 })),
    getById: mock(async () => makeRow()),
    getCumulativeSize: mock(async () => 0),
    insert: mock(async () => makeRow()),
    updateLabel: mock(async () => makeRow({ label: 'Updated' })),
    deleteById: mock(async () => ({ deleted: true })),
    getActiveByIdsForOrg: mock(async () => []),
    countActiveForOrganization: mock(async () => 0),
    ...overrides,
  }
}

function makeStorage(): LegalDocumentStoragePort {
  return {
    uploadBuffer: mock(async () => {}),
    getDownloadUrl: mock(async () => 'https://example.com/download'),
  }
}

const mimeDetector: LegalDocumentMimeDetectorPort = {
  detectMime: mock(async () => ({ mime: 'application/pdf' })),
}

const ids: LegalDocumentIdPort = {
  newId: mock(() => 'doc-1'),
}

const clock: LegalDocumentClockPort = {
  now: () => new Date('2026-01-01T00:00:00.000Z'),
}

describe('Legal document use cases', () => {
  it('uploads valid PDFs through repository and storage ports', async () => {
    const repository = makeRepository()
    const storage = makeStorage()
    const useCase = new UploadLegalDocumentsUseCase(repository, storage, mimeDetector, ids)

    const result = await useCase.execute({
      organizationId: 'org-1',
      uploadedById: 'user-1',
      files: [makeFile()],
      metadata: [{ label: ' Custom contract ' }],
    })

    expect(result.documents).toHaveLength(1)
    expect(result.documents[0]?.label).toBe('Contract')
    expect(repository.getCumulativeSize).toHaveBeenCalledWith('org-1')
    expect(storage.uploadBuffer).toHaveBeenCalledWith({
      key: 'legal-documents/org-1/doc-1.pdf',
      data: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      contentType: 'application/pdf',
      metadata: { orgId: 'org-1', uploadedById: 'user-1' },
    })
    expect(repository.insert).toHaveBeenCalledWith({
      organizationId: 'org-1',
      label: 'Custom contract',
      s3Key: 'legal-documents/org-1/doc-1.pdf',
      sizeBytes: 12,
      originalFilename: 'Contract.pdf',
      uploadedById: 'user-1',
    })
  })

  it('rejects uploads that exceed organization quota before storage writes', async () => {
    const repository = makeRepository({
      getCumulativeSize: mock(async () => LEGAL_DOC_QUOTA_BYTES),
    })
    const storage = makeStorage()
    const useCase = new UploadLegalDocumentsUseCase(repository, storage, mimeDetector, ids)

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        uploadedById: 'user-1',
        files: [makeFile()],
        metadata: [],
      })
    ).rejects.toBeInstanceOf(LegalDocumentQuotaExceededError)

    expect(storage.uploadBuffer).not.toHaveBeenCalled()
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('rejects files whose magic bytes are not PDF', async () => {
    const repository = makeRepository()
    const storage = makeStorage()
    const detector: LegalDocumentMimeDetectorPort = {
      detectMime: mock(async () => ({ mime: 'text/plain' })),
    }
    const useCase = new UploadLegalDocumentsUseCase(repository, storage, detector, ids)

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        uploadedById: 'user-1',
        files: [makeFile()],
        metadata: [],
      })
    ).rejects.toBeInstanceOf(LegalDocumentValidationError)

    expect(storage.uploadBuffer).not.toHaveBeenCalled()
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('generates download URLs with stable expiry calculation', async () => {
    const repository = makeRepository()
    const storage = makeStorage()
    const useCase = new GenerateLegalDocumentDownloadUrlUseCase(repository, storage, clock)

    const result = await useCase.execute({ documentId: 'doc-1', organizationId: 'org-1' })

    expect(result).toEqual({
      url: 'https://example.com/download',
      expiresAt: '2026-01-01T01:00:00.000Z',
    })
    expect(storage.getDownloadUrl).toHaveBeenCalledWith(
      'legal-documents/org-1/doc-1.pdf',
      3600,
      'Contract.pdf'
    )
  })

  it('maps missing rows to typed not found errors', async () => {
    const repository = makeRepository({
      getById: mock(async () => null),
      updateLabel: mock(async () => null),
      deleteById: mock(async () => ({ deleted: false })),
    })

    await expect(
      new GenerateLegalDocumentDownloadUrlUseCase(repository, makeStorage(), clock).execute({
        documentId: 'doc-1',
        organizationId: 'org-1',
      })
    ).rejects.toBeInstanceOf(LegalDocumentNotFoundError)

    await expect(
      new UpdateLegalDocumentLabelUseCase(repository).execute({
        documentId: 'doc-1',
        organizationId: 'org-1',
        label: 'Updated',
      })
    ).rejects.toBeInstanceOf(LegalDocumentNotFoundError)

    await expect(
      new DeleteLegalDocumentUseCase(repository).execute({
        documentId: 'doc-1',
        organizationId: 'org-1',
      })
    ).rejects.toBeInstanceOf(LegalDocumentNotFoundError)
  })
})
