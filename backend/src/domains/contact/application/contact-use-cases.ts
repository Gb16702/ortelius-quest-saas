import { buildContactEmail, contactRecipientForEnvironment } from '../domain'
import type { ContactFormData, ContactSendResult } from './contact-models'
import type { ContactEmailPort } from './ports'

export class SendContactEmailUseCase {
  constructor(
    private readonly email: ContactEmailPort,
    private readonly nodeEnv?: string
  ) {}

  async execute(data: ContactFormData): Promise<ContactSendResult> {
    const content = buildContactEmail(data, contactRecipientForEnvironment(this.nodeEnv))
    const result = await this.email.sendContactEmail(content)

    return { success: true, messageId: result.messageId }
  }
}
