import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { createContactRoutes } from '../presentation/contact.routes'

const contactService = {
  sendContactEmail: mock(async () => ({ success: true as const, messageId: 'message-123' })),
}

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/contact', createContactRoutes(contactService))
  return app
}

describe('Contact routes', () => {
  beforeEach(() => {
    contactService.sendContactEmail.mockClear()
  })

  it('sends contact form data through the application facade', async () => {
    const payload = {
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      country: 'BE',
      message: 'Hello',
    }

    const response = await createApp().request('/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, messageId: 'message-123' })
    expect(contactService.sendContactEmail).toHaveBeenCalledWith(payload)
  })

  it('rejects invalid contact form data', async () => {
    const response = await createApp().request('/contact', {
      method: 'POST',
      body: JSON.stringify({ email: 'bad' }),
      headers: { 'Content-Type': 'application/json' },
    })

    expect(response.status).toBe(400)
    expect(contactService.sendContactEmail).not.toHaveBeenCalled()
  })
})
