import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../../infrastructure/types/api.types'
import { createMessageRoutes } from '../presentation/message.routes'

const messageDto = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-1',
  content: 'Hello',
  messageType: 'text',
  replyToId: null,
  metadata: null,
  isEdited: false,
  isDeleted: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const service = {
  canAccessConversation: mock(async () => true),
  uploadAttachments: mock(async () => [
    {
      id: 'att-1',
      filename: 'stored.pdf',
      originalName: 'Contract.pdf',
      size: 10,
      mimeType: 'application/pdf',
      s3Key: 'stored.pdf',
      uploadedAt: '2026-01-01T00:00:00.000Z',
      uploadedBy: 'user-1',
    },
  ]),
  sendMessage: mock(async () => messageDto),
  addReaction: mock(async () => ({
    id: 'reaction-1',
    messageId: 'msg-1',
    userId: 'user-1',
    emoji: 'ok',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  })),
  removeReaction: mock(async () => []),
  deleteMessage: mock(async () => {}),
  editMessage: mock(async () => ({ ...messageDto, content: 'Updated', isEdited: true })),
  pinMessage: mock(async () => ({ ...messageDto, isPinned: true })),
  unpinMessage: mock(async () => ({ ...messageDto, isPinned: false })),
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

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/messages', createMessageRoutes(service, auth))
  return app
}

describe('Message routes', () => {
  beforeEach(() => {
    for (const fn of Object.values(service)) {
      fn.mockClear()
    }
  })

  it('sends messages through the application service', async () => {
    const response = await createApp().request('/messages/conv-1', {
      method: 'POST',
      body: JSON.stringify({ content: ' Hello ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.data).toEqual({
      ...messageDto,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(service.sendMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Hello',
      messageType: 'text',
      replyToId: undefined,
      metadata: undefined,
    })
  })

  it('preserves request shared metadata for system messages', async () => {
    const response = await createApp().request('/messages/conv-1', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Ada shared a request',
        messageType: 'system',
        metadata: {
          type: 'request_shared',
          requestId: 'request-1',
          requestNumber: 'REQ-1',
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(201)
    expect(service.sendMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Ada shared a request',
      messageType: 'system',
      replyToId: undefined,
      metadata: {
        type: 'request_shared',
        requestId: 'request-1',
        requestNumber: 'REQ-1',
      },
    })
  })

  it('rejects whitespace-only messages before reaching the application service', async () => {
    const response = await createApp().request('/messages/conv-1', {
      method: 'POST',
      body: JSON.stringify({ content: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
    expect(service.sendMessage).not.toHaveBeenCalled()
  })

  it('uploads attachments through the application service', async () => {
    const form = new FormData()
    form.append('file0', new File(['pdf'], 'Contract.pdf', { type: 'application/pdf' }))

    const response = await createApp().request('/messages/conv-1/attachments', {
      method: 'POST',
      body: form,
    })
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.data.attachments).toHaveLength(1)
    expect(service.uploadAttachments).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'user-1',
      files: [expect.any(File)],
    })
  })

  it('uses matching error codes when attachment upload fails', async () => {
    const forbiddenForm = new FormData()
    forbiddenForm.append('file0', new File(['pdf'], 'Contract.pdf', { type: 'application/pdf' }))
    service.uploadAttachments.mockRejectedValueOnce(new Error('Forbidden'))

    const forbiddenResponse = await createApp().request('/messages/conv-1/attachments', {
      method: 'POST',
      body: forbiddenForm,
    })
    const forbiddenJson = await forbiddenResponse.json()

    expect(forbiddenResponse.status).toBe(403)
    expect(forbiddenJson).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'Forbidden',
    })

    const badRequestForm = new FormData()
    badRequestForm.append('file0', new File(['pdf'], 'Contract.pdf', { type: 'application/pdf' }))
    service.uploadAttachments.mockRejectedValueOnce(new Error('At least one file is required'))

    const badRequestResponse = await createApp().request('/messages/conv-1/attachments', {
      method: 'POST',
      body: badRequestForm,
    })
    const badRequestJson = await badRequestResponse.json()

    expect(badRequestResponse.status).toBe(400)
    expect(badRequestJson).toEqual({
      success: false,
      code: 'BAD_REQUEST',
      message: 'At least one file is required',
    })
  })

  it('does not expose unexpected message service failures', async () => {
    service.sendMessage.mockRejectedValueOnce(new Error('database password=secret'))

    const response = await createApp().request('/messages/conv-1', {
      method: 'POST',
      body: JSON.stringify({ content: ' Hello ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json).toEqual({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to send message',
    })
  })

  it('maps message authorization failures to a forbidden contract', async () => {
    service.deleteMessage.mockRejectedValueOnce(
      new Error('Only the message sender can delete this message')
    )

    const response = await createApp().request('/messages/msg-1', { method: 'DELETE' })
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the message sender can delete this message',
    })
  })

  it('routes reactions and pinning through the application service', async () => {
    expect(
      (
        await createApp().request('/messages/msg-1/reactions', {
          method: 'POST',
          body: JSON.stringify({ emoji: 'ok' }),
          headers: { 'Content-Type': 'application/json' },
        })
      ).status
    ).toBe(201)
    expect(
      (await createApp().request('/messages/msg-1/reactions/ok', { method: 'DELETE' })).status
    ).toBe(200)
    expect((await createApp().request('/messages/msg-1/pin', { method: 'POST' })).status).toBe(200)
    expect((await createApp().request('/messages/msg-1/pin', { method: 'DELETE' })).status).toBe(
      200
    )
  })

  it('routes edits and deletes through the application service', async () => {
    expect(
      (
        await createApp().request('/messages/msg-1', {
          method: 'PATCH',
          body: JSON.stringify({ content: ' Updated ' }),
          headers: { 'Content-Type': 'application/json' },
        })
      ).status
    ).toBe(200)
    expect((await createApp().request('/messages/msg-1', { method: 'DELETE' })).status).toBe(200)
    expect(service.editMessage).toHaveBeenCalledWith('msg-1', 'user-1', 'Updated')
    expect(service.deleteMessage).toHaveBeenCalledWith('msg-1', 'user-1')
  })

  it('rejects whitespace-only edits before reaching the application service', async () => {
    const response = await createApp().request('/messages/msg-1', {
      method: 'PATCH',
      body: JSON.stringify({ content: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
    expect(service.editMessage).not.toHaveBeenCalled()
  })
})
