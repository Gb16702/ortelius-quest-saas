import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { RequestDocumentNotFoundError } from '../application/document-use-cases'
import { createDocumentsRoutes } from '../presentation/documents.routes'

const service = {
  uploadDocuments: mock(async () => []),
  uploadDocumentsForRequest: mock(async () => []),
  deleteRequestDocument: mock(async () => []),
  generateRequestPdf: mock(async () => ({
    buffer: Buffer.from('%PDF'),
    filename: 'request.pdf',
  })),
}

const auth = async (c: any, next: () => Promise<void>) => {
  c.set('user', {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    image: null,
    role: 'user',
  })
  await next()
}

const unauthenticated = async (c: any) => {
  return c.json({ success: false, code: 'UNAUTHORIZED', message: 'Authentication required' }, 401)
}

function createApp(authMiddleware = auth) {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/documents', createDocumentsRoutes(service, authMiddleware))
  return app
}

describe('Documents routes', () => {
  beforeEach(() => {
    for (const fn of Object.values(service)) {
      fn.mockClear()
    }
  })

  it('does not expose unexpected request document upload errors', async () => {
    const form = new FormData()
    form.append('file0', new File(['pdf'], 'Contract.pdf', { type: 'application/pdf' }))
    service.uploadDocumentsForRequest.mockRejectedValueOnce(
      new Error('database password=secret provider token leaked')
    )

    const response = await createApp().request('/documents/requests/request-1/documents', {
      method: 'POST',
      body: form,
    })
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to upload request documents',
    })
  })

  it('maps request document validation errors to bad request', async () => {
    const form = new FormData()
    form.append('file0', new File(['bad'], 'payload.exe', { type: 'application/x-msdownload' }))
    service.uploadDocumentsForRequest.mockRejectedValueOnce(
      new Error('Unsupported file type: application/x-msdownload. Supported types: application/pdf')
    )

    const response = await createApp().request('/documents/requests/request-1/documents', {
      method: 'POST',
      body: form,
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Unsupported file type: application/x-msdownload. Supported types: application/pdf',
    })
  })

  it('requires authentication before generating request PDFs', async () => {
    const response = await createApp(unauthenticated).request('/documents/request/request-1')
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.code).toBe('UNAUTHORIZED')
    expect(service.generateRequestPdf).not.toHaveBeenCalled()
  })

  it('generates request PDFs for the authenticated actor only after passing actor context', async () => {
    const response = await createApp().request('/documents/request/request-1')

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="request.pdf"')
    expect(service.generateRequestPdf).toHaveBeenCalledWith({
      requestId: 'request-1',
      actorId: 'user-1',
    })
  })

  it('maps unauthorized request PDF access to not found without returning a PDF', async () => {
    service.generateRequestPdf.mockRejectedValueOnce(new RequestDocumentNotFoundError())

    const response = await createApp().request('/documents/request/request-1')
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Request not found',
    })
  })
})
