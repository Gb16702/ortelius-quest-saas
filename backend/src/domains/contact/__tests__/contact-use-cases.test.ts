import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { SendContactEmailUseCase } from '../application/contact-use-cases'

const emailPort = {
  sendContactEmail: mock(async () => ({ messageId: 'message-123' })),
}

describe('Contact use cases', () => {
  beforeEach(() => {
    emailPort.sendContactEmail.mockClear()
  })

  it('sends contact email through the email port', async () => {
    const result = await new SendContactEmailUseCase(emailPort, 'production').execute({
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      country: 'BE',
      message: 'Hello',
    })

    expect(result).toEqual({ success: true, messageId: 'message-123' })
    expect(emailPort.sendContactEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'info@ortelius.app',
        replyTo: 'ada@example.com',
      })
    )
  })
})
