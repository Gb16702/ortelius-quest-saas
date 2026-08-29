import { categoriesApplicationService } from '../../categories/categories.application'
import { servicesApplicationService } from '../../services/services.application'
import type { ExtractionContextPort } from '../application/ports'
import type { ExtractionContext } from '../application/webhook-models'

export class ApplicationExtractionContextAdapter implements ExtractionContextPort {
  async getExtractionContext(organizationId: string): Promise<ExtractionContext> {
    const [services, categories] = await Promise.all([
      servicesApplicationService.getByOrganization(organizationId),
      categoriesApplicationService.getByOrganization(organizationId),
    ])

    return {
      availableServices: services.map((s) => ({ id: s.id, name: s.name })),
      availableCategories: categories.map((c) => ({ id: c.id, name: c.name })),
    }
  }
}
