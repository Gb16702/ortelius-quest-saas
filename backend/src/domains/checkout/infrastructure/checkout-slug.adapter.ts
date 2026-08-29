import {
  generateSlug,
  isSlugAvailable,
  validateSlug,
} from '../../../infrastructure/networking/slug.service'
import type { CheckoutSlugPort } from '../application/ports'

export class NetworkCheckoutSlugAdapter implements CheckoutSlugPort {
  generateSlug(organizationName: string): string {
    return generateSlug(organizationName)
  }

  validateSlug(slug: string) {
    return validateSlug(slug)
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    return await isSlugAvailable(slug)
  }
}
