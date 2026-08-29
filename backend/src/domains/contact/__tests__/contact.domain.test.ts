import { describe, expect, it } from 'bun:test'
import { buildContactEmail, contactRecipientForEnvironment } from '../domain'

describe('Contact domain', () => {
  it('builds contact email content from form data', () => {
    const email = buildContactEmail(
      {
        email: 'ada@example.com',
        fullName: 'Ada Lovelace',
        country: 'BE',
        website: 'https://example.com',
        companySize: '10-50',
        message: 'Hello\nWorld',
      },
      'info@ortelius.app'
    )

    expect(email).toMatchObject({
      to: 'info@ortelius.app',
      replyTo: 'ada@example.com',
      subject: '[Ortelius Quest] Contact from Ada Lovelace',
    })
    expect(email.htmlBody).toContain('Hello<br />World')
    expect(email.textBody).toContain('Website: https://example.com')
  })

  it('selects the production recipient only in production', () => {
    expect(contactRecipientForEnvironment('production')).toBe('info@ortelius.app')
    expect(contactRecipientForEnvironment('development')).toBe('delgeoffrey1@gmail.com')
  })
})
