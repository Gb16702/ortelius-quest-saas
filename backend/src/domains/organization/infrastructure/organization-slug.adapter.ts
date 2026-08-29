import {
  isSlugAvailableForOrganization,
  validateSlug,
} from '../../../infrastructure/networking/slug.service'
import type { OrganizationSlugPort } from '../application/ports'

export class NetworkOrganizationSlugAdapter implements OrganizationSlugPort {
  validateSlug(slug: string) {
    return validateSlug(slug)
  }

  async isSlugAvailableForOrganization(slug: string, organizationId: string): Promise<boolean> {
    return await isSlugAvailableForOrganization(slug, organizationId)
  }
}
