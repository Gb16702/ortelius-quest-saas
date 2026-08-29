import postmark from 'postmark'
import { env } from '../../../infrastructure/config/environment'
import type { ContactEmailContent } from '../application/contact-models'
import type { ContactEmailPort } from '../application/ports'

export class PostmarkContactEmailAdapter implements ContactEmailPort {
  private readonly client = new postmark.ServerClient(env.POSTMARK_API_KEY!)

  async sendContactEmail(content: ContactEmailContent): Promise<{ messageId: string }> {
    const result = await this.client.sendEmail({
      From: 'noreply@ortelius.app',
      To: content.to,
      ReplyTo: content.replyTo,
      Subject: content.subject,
      HtmlBody: content.htmlBody,
      TextBody: content.textBody,
      MessageStream: 'outbound',
    })

    return { messageId: result.MessageID }
  }
}
