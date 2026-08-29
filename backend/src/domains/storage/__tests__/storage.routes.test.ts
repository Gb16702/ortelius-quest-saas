import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'

const storageService = {
  generateUploadUrls: mock(async () => ({
    uploadId: 'upload-id',
    key: 'call-recordings/conversation-1/call-1.webm',
    urls: ['part-url'],
    completeUrl: 'complete-url',
    abortUrl: 'abort-url',
    callId: 'call-1',
    conversationId: 'conversation-1',
    expiresAt: '2026-05-07T13:00:00.000Z',
  })),
  completeUpload: mock(async () => ({
    success: true,
    location: 's3://bucket/key',
    message: 'Upload completed successfully.',
  })),
  abortUpload: mock(async () => ({
    success: true,
    message: 'Upload aborted successfully',
  })),
}

const authMiddleware = async (c: Context<{ Variables: CommonVariables }>, next: Next) => {
  c.set('user', { id: 'user-123', name: 'Ada Lovelace' } as never)
  await next()
}

mock.module('../storage.application', () => ({
  storageApplicationService: storageService,
}))

const { createStorageRoutes } = await import('../presentation/storage.routes')

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/storage', createStorageRoutes(storageService, authMiddleware))
  return app
}

describe('Storage routes', () => {
  beforeEach(() => {
    Object.values(storageService).forEach((fn) => fn.mockClear())
  })

  it('generates upload urls through the application facade', async () => {
    const response = await createApp().request('/storage/upload/generate-urls', {
      method: 'POST',
      body: JSON.stringify({ callId: 'call-1', conversationId: 'conversation-1', maxParts: 2 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Upload URLs generated successfully')
    expect(storageService.generateUploadUrls).toHaveBeenCalledWith({
      callId: 'call-1',
      conversationId: 'conversation-1',
      maxParts: 2,
    })
  })

  it('completes uploads with authenticated speaker info', async () => {
    const response = await createApp().request('/storage/upload/complete', {
      method: 'POST',
      body: JSON.stringify({
        key: 'recording.webm',
        uploadId: 'upload-id',
        parts: [{ ETag: 'etag-1', PartNumber: 1 }],
        callId: 'call-1',
        conversationId: 'conversation-1',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(storageService.completeUpload).toHaveBeenCalledWith(
      {
        key: 'recording.webm',
        uploadId: 'upload-id',
        parts: [{ ETag: 'etag-1', PartNumber: 1 }],
        callId: 'call-1',
        conversationId: 'conversation-1',
      },
      { userId: 'user-123', userName: 'Ada Lovelace' }
    )
  })

  it('aborts uploads through the application facade', async () => {
    const response = await createApp().request('/storage/upload/abort', {
      method: 'POST',
      body: JSON.stringify({ key: 'recording.webm', uploadId: 'upload-id' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(storageService.abortUpload).toHaveBeenCalledWith({
      key: 'recording.webm',
      uploadId: 'upload-id',
    })
  })
})
