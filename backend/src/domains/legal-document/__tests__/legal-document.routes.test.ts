import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { LegalDocumentNotFoundError } from '../application/legal-document-errors'
import type { LegalDocument } from '../application/legal-document-models'
import { createLegalDocumentRoutes } from '../presentation/legal-document.routes'

const documentId = '11111111-1111-4111-8111-111111111111'

const documentDto: LegalDocument = {
  id: documentId,
  organizationId: 'org-1',
  label: 'Contract',
  sizeBytes: 12,
  mimeType: 'application/pdf',
  originalFilename: 'Contract.pdf',
  scanStatus: 'clean',
  uploadedById: 'user-1',
  uploadedByName: 'Ada Lovelace',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
}

const service = {
  listForOrganization: mock(async () => ({ documents: [documentDto], totalSizeBytes: 12 })),
  generateDownloadUrl: mock(async () => ({
    url: 'https://example.com/download',
    expiresAt: '2026-01-01T01:00:00.000Z',
  })),
  upload: mock(async () => ({ documents: [documentDto] })),
  updateLabel: mock(async () => ({ ...documentDto, label: 'Updated' })),
  deleteById: mock(async () => {}),
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

const pass = async (_c: any, next: () => Promise<void>) => {
  await next()
}

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/organizations', createLegalDocumentRoutes(service, auth, pass, pass))
  return app
}

describe('Legal document routes', () => {
  beforeEach(() => {
    for (const fn of Object.values(service)) {
      fn.mockClear()
    }
  })

  it('lists organization legal documents through the application service', async () => {
    const response = await createApp().request('/organizations/org-1/legal-documents')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.documents).toEqual([documentDto])
    expect(json.data.totalSizeBytes).toBe(12)
    expect(json.data.quotaBytes).toBe(500 * 1024 * 1024)
    expect(service.listForOrganization).toHaveBeenCalledWith('org-1')
  })

  it('generates download URLs and maps not found errors', async () => {
    let response = await createApp().request(
      `/organizations/org-1/legal-documents/${documentId}/download-url`
    )
    let json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.url).toBe('https://example.com/download')
    expect(service.generateDownloadUrl).toHaveBeenCalledWith(documentId, 'org-1')

    service.generateDownloadUrl.mockImplementationOnce(async () => {
      throw new LegalDocumentNotFoundError()
    })
    response = await createApp().request(
      `/organizations/org-1/legal-documents/${documentId}/download-url`
    )
    json = await response.json()

    expect(response.status).toBe(404)
    expect(json).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Legal document not found',
    })
  })

  it('passes multipart uploads to the application service without changing the HTTP contract', async () => {
    const form = new FormData()
    form.append('files', new File(['%PDF-1.4'], 'Contract.pdf', { type: 'application/pdf' }))
    form.append('metadata', JSON.stringify([{ label: 'Contract label' }]))

    const response = await createApp().request('/organizations/org-1/legal-documents', {
      method: 'POST',
      body: form,
    })
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.documents).toEqual([documentDto])
    expect(service.upload).toHaveBeenCalledWith({
      organizationId: 'org-1',
      uploadedById: 'user-1',
      files: [expect.any(File)],
      metadata: [{ label: 'Contract label' }],
    })
  })

  it('updates and deletes documents through the application service', async () => {
    const patchResponse = await createApp().request(
      `/organizations/org-1/legal-documents/${documentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ label: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      }
    )
    const patchJson = await patchResponse.json()

    expect(patchResponse.status).toBe(200)
    expect(patchJson.data.label).toBe('Updated')
    expect(service.updateLabel).toHaveBeenCalledWith(documentId, 'org-1', 'Updated')

    const deleteResponse = await createApp().request(
      `/organizations/org-1/legal-documents/${documentId}`,
      { method: 'DELETE' }
    )

    expect(deleteResponse.status).toBe(204)
    expect(service.deleteById).toHaveBeenCalledWith(documentId, 'org-1')
  })
})
