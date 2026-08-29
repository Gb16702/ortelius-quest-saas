import type { ContactFormData, ContactSendResult } from './application/contact-models'
import { getContactUseCases } from './infrastructure/contact-use-cases'

export class ContactApplicationService {
  async sendContactEmail(data: ContactFormData): Promise<ContactSendResult> {
    const useCases = await getContactUseCases()
    return await useCases.sendContactEmail.execute(data)
  }
}

export const contactApplicationService = new ContactApplicationService()
