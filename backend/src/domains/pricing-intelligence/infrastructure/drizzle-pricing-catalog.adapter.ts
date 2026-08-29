import { eq, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { category } from '../../../infrastructure/database/db/schemas/category-schema'
import { organizationCategories } from '../../../infrastructure/database/db/schemas/organization-categories-schema'
import { organizationServices } from '../../../infrastructure/database/db/schemas/organization-services-schema'
import { service } from '../../../infrastructure/database/db/schemas/services-schema'
import type { PricingCatalogPort } from '../application/ports'
import type { ServiceReference } from '../application/pricing-intelligence-models'

export class DrizzlePricingCatalogAdapter implements PricingCatalogPort {
  async listOrganizationServices(organizationId: string): Promise<ServiceReference[]> {
    return await db
      .select({ id: service.id, name: service.name })
      .from(organizationServices)
      .innerJoin(service, eq(organizationServices.serviceId, service.id))
      .where(eq(organizationServices.organizationId, organizationId))
  }

  async listOrganizationCategories(
    organizationId: string
  ): Promise<Array<{ id: string; name: string }>> {
    return await db
      .select({ id: category.id, name: category.name })
      .from(organizationCategories)
      .innerJoin(category, eq(organizationCategories.categoryId, category.id))
      .where(eq(organizationCategories.organizationId, organizationId))
  }

  async listServicesByIds(serviceIds: string[]): Promise<ServiceReference[]> {
    if (serviceIds.length === 0) return []

    return await db
      .select({ id: service.id, name: service.name })
      .from(service)
      .where(
        sql`${service.id} IN (${sql.join(
          serviceIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
  }
}
