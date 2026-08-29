import { env } from '../../../infrastructure/config/environment'
import { SendContactEmailUseCase } from '../application/contact-use-cases'
import { PostmarkContactEmailAdapter } from './postmark-contact-email.adapter'

let contactUseCases: { sendContactEmail: SendContactEmailUseCase } | null = null

export async function getContactUseCases() {
  if (!contactUseCases) {
    contactUseCases = {
      sendContactEmail: new SendContactEmailUseCase(
        new PostmarkContactEmailAdapter(),
        env.NODE_ENV
      ),
    }
  }

  return contactUseCases
}
