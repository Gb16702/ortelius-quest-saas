import type { OrganizationShowcaseData } from '../domain'
import { OrganizationNotFoundError } from './organization-errors'
import type { OrganizationShowcaseQueryPort } from './ports'

export class GetOrganizationShowcaseUseCase {
  constructor(private readonly showcase: OrganizationShowcaseQueryPort) {}

  async execute(command: { slug: string; days?: number }): Promise<OrganizationShowcaseData> {
    const showcaseData = await this.showcase.findBySlug(command.slug, command.days)
    if (!showcaseData) {
      throw new OrganizationNotFoundError()
    }

    return showcaseData
  }
}
