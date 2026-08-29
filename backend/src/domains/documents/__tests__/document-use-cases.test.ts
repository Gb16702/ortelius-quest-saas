import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  DeleteRequestDocumentUseCase,
  GenerateRequestPdfUseCase,
  ListRequestDocumentsUseCase,
  RequestDocumentForbiddenError,
  RequestDocumentNotFoundError,
  UploadDocumentsUseCase,
  UploadRequestDocumentsUseCase,
} from '../application/document-use-cases'
import type {
  DocumentRepositoryPort,
  PdfGeneratorPort,
  RequestDocumentAuthorizationPort,
  RequestDocumentSourcePort,
} from '../application/ports'

const file = new File(['content'], 'request.pdf', { type: 'application/pdf' })

const uploadedDocument = {
  url: 'https://bucket.s3.amazonaws.com/documents/request.pdf',
  filename: 'documents/request.pdf',
  originalName: 'request.pdf',
  size: file.size,
  mimeType: file.type,
}

const request = {
  id: 'request-123',
  reqNumber: 'REQ-001',
  requesterId: 'user-123',
  requester: { name: 'Ada Lovelace', email: 'ada@example.com' },
  organization: { name: 'Ortelius' },
  categories: [{ name: 'Transport', slug: 'transport' }],
  services: ['Freight'],
  documents: [uploadedDocument.url],
  lifecycleStatus: 'open',
}

const documents: DocumentRepositoryPort = {
  uploadDocument: mock(() => Promise.resolve(uploadedDocument)),
  uploadDocuments: mock(() => Promise.resolve([uploadedDocument])),
  uploadRequestDocuments: mock(() => Promise.resolve([uploadedDocument.url])),
  deleteDocument: mock(() => Promise.resolve()),
  deleteDocuments: mock(() => Promise.resolve()),
  generateSignedUrl: mock(() => Promise.resolve('signed-url')),
  generateSignedUrls: mock(() =>
    Promise.resolve([
      {
        originalUrl: uploadedDocument.url,
        signedUrl: 'signed-url',
        filename: 'request.pdf',
      },
    ])
  ),
}

const requests: RequestDocumentSourcePort = {
  getRequestById: mock(() => Promise.resolve(request)),
  getRequestByNumber: mock(() => Promise.resolve(null)),
  removeDocumentFromRequest: mock(() => Promise.resolve()),
}

const authorization: RequestDocumentAuthorizationPort = {
  resolveAccessibleRequestById: mock(() => Promise.resolve(request.id)),
  resolveAccessibleRequestByNumber: mock(() => Promise.resolve(null)),
}

const pdf: PdfGeneratorPort = {
  generateRequestPdf: mock(() => Promise.resolve(Buffer.from('%PDF'))),
  generateRequestPdfStream: mock(() => ({}) as NodeJS.ReadableStream),
}

describe('Document use cases', () => {
  beforeEach(() => {
    Object.values(documents).forEach((fn) => {
      if ('mockClear' in fn) {
        fn.mockClear()
      }
    })
    Object.values(requests).forEach((fn) => fn.mockClear())
    Object.values(authorization).forEach((fn) => fn.mockClear())
    Object.values(pdf).forEach((fn) => fn.mockClear())
    requests.getRequestById.mockImplementation(() => Promise.resolve(request))
    requests.getRequestByNumber.mockImplementation(() => Promise.resolve(null))
    authorization.resolveAccessibleRequestById.mockImplementation(() => Promise.resolve(request.id))
    authorization.resolveAccessibleRequestByNumber.mockImplementation(() => Promise.resolve(null))
  })

  it('uploads documents through the repository port', async () => {
    await expect(new UploadDocumentsUseCase(documents).execute({ files: [file] })).resolves.toEqual(
      [uploadedDocument]
    )

    expect(documents.uploadDocuments).toHaveBeenCalledWith([file], undefined)
  })

  it('uploads request documents only for the requester', async () => {
    await expect(
      new UploadRequestDocumentsUseCase(documents, requests).execute({
        requestId: request.id,
        actorId: request.requesterId,
        files: [file],
      })
    ).resolves.toEqual([uploadedDocument.url])

    expect(documents.uploadRequestDocuments).toHaveBeenCalledWith(request.id, [file])
  })

  it('rejects request uploads when the request is missing or owned by another user', async () => {
    requests.getRequestById.mockImplementationOnce(() => Promise.resolve(null))

    await expect(
      new UploadRequestDocumentsUseCase(documents, requests).execute({
        requestId: request.id,
        actorId: request.requesterId,
        files: [file],
      })
    ).rejects.toBeInstanceOf(RequestDocumentNotFoundError)

    requests.getRequestById.mockImplementationOnce(() =>
      Promise.resolve({ ...request, requesterId: 'other-user' })
    )

    await expect(
      new UploadRequestDocumentsUseCase(documents, requests).execute({
        requestId: request.id,
        actorId: request.requesterId,
        files: [file],
      })
    ).rejects.toBeInstanceOf(RequestDocumentForbiddenError)
  })

  it('lists request documents as signed urls', async () => {
    await expect(
      new ListRequestDocumentsUseCase(documents, requests).execute({
        requestId: request.id,
        actorId: request.requesterId,
      })
    ).resolves.toEqual([
      {
        originalUrl: uploadedDocument.url,
        signedUrl: 'signed-url',
        filename: 'request.pdf',
      },
    ])

    expect(documents.generateSignedUrls).toHaveBeenCalledWith([uploadedDocument.url])
  })

  it('removes request documents and returns remaining urls', async () => {
    requests.getRequestById
      .mockImplementationOnce(() => Promise.resolve(request))
      .mockImplementationOnce(() => Promise.resolve({ ...request, documents: [] }))

    await expect(
      new DeleteRequestDocumentUseCase(requests).execute({
        requestId: request.id,
        actorId: request.requesterId,
        documentUrl: uploadedDocument.url,
      })
    ).resolves.toEqual([])

    expect(requests.removeDocumentFromRequest).toHaveBeenCalledWith(
      request.id,
      uploadedDocument.url
    )
  })

  it('generates a request pdf after resolving actor access', async () => {
    await expect(
      new GenerateRequestPdfUseCase(pdf, requests, authorization).execute({
        requestId: request.id,
        actorId: request.requesterId,
      })
    ).resolves.toEqual({
      buffer: Buffer.from('%PDF'),
      filename: 'REQ-001.pdf',
    })

    expect(authorization.resolveAccessibleRequestById).toHaveBeenCalledWith(
      request.id,
      request.requesterId
    )
    expect(requests.getRequestById).toHaveBeenCalledWith(request.id)
    expect(pdf.generateRequestPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        reqNumber: 'REQ-001',
        requesterName: 'Ada Lovelace',
        receiverOrganizationId: 'Ortelius',
      })
    )
  })

  it('rejects request pdf generation before loading private request details when actor lacks access', async () => {
    authorization.resolveAccessibleRequestById.mockImplementationOnce(() => Promise.resolve(null))
    authorization.resolveAccessibleRequestByNumber.mockImplementationOnce(() =>
      Promise.resolve(null)
    )

    await expect(
      new GenerateRequestPdfUseCase(pdf, requests, authorization).execute({
        requestId: request.id,
        actorId: 'other-user',
      })
    ).rejects.toBeInstanceOf(RequestDocumentNotFoundError)

    expect(requests.getRequestById).not.toHaveBeenCalled()
    expect(requests.getRequestByNumber).not.toHaveBeenCalled()
    expect(pdf.generateRequestPdf).not.toHaveBeenCalled()
  })
})
