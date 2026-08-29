import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../../infrastructure/types/api.types'
import { MessageReadOwnMessageError } from '../domain'
import { createMessageReadRoutes } from '../presentation/message-read.routes'

const service = {
  markMessageAsRead: mock(async () => ({ success: true })),
  markConversationAsRead: mock(async () => ({ success: true, markedCount: 2 })),
  getConversationReadStatuses: mock(async () => ({ readStatuses: [] })),
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
  app.route('/', createMessageReadRoutes(service, auth))
  return app
}

describe('Message read routes', () => {
  beforeEach(() => {
    for (const fn of Object.values(service)) {
      fn.mockClear()
    }
  })

  it('marks one message as read through the application service', async () => {
    const response = await createApp().request('/messages/msg-1/read', { method: 'PATCH' })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: { success: true },
      message: 'Message marked as read successfully',
    })
    expect(service.markMessageAsRead).toHaveBeenCalledWith('msg-1', 'user-1')
  })

  it('supports both conversation mark-read routes', async () => {
    let response = await createApp().request('/conversations/conv-1/read', { method: 'PATCH' })
    expect(response.status).toBe(200)
    expect(service.markConversationAsRead).toHaveBeenCalledWith('conv-1', 'user-1')

    response = await createApp().request('/conversations/conv-1/mark-read', { method: 'POST' })
    expect(response.status).toBe(200)
    expect(service.markConversationAsRead).toHaveBeenCalledTimes(2)
  })

  it('returns read statuses through the application service', async () => {
    const response = await createApp().request('/conversations/conv-1/read-status')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, data: { readStatuses: [] } })
    expect(service.getConversationReadStatuses).toHaveBeenCalledWith('conv-1', 'user-1')
  })

  it('maps typed domain errors without changing response shape', async () => {
    service.markMessageAsRead.mockImplementationOnce(async () => {
      throw new MessageReadOwnMessageError()
    })

    const response = await createApp().request('/messages/msg-1/read', { method: 'PATCH' })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Cannot mark own message as read',
    })
  })
})
