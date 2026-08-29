import type { ContactEmailContent } from './contact-models'

export interface ContactEmailPort {
  sendContactEmail(content: ContactEmailContent): Promise<{ messageId: string }>
}
