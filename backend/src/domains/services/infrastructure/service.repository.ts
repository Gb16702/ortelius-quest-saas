import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { organizationServices } from '../../../infrastructure/database/db/schemas/organization-services-schema'
import { service } from '../../../infrastructure/database/db/schemas/services-schema'
import type { ServiceRepositoryPort } from '../application/ports'
import type {
  OrganizationServiceOperations,
  Service,
  ServiceWithSelectionStatus,
} from '../application/service-models'
import { sortByName } from '../domain'

export class DrizzleServiceRepository implements ServiceRepositoryPort {
  async getAll(): Promise<Service[]> {
    try {
      const services = await db.select().from(service)
      return this.sortServicesByName(services)
    } catch (error) {
      throw new Error('Failed to fetch services', { cause: error })
    }
  }

  async getByOrganization(organizationId: string): Promise<Service[]> {
    try {
      const results = await db
        .select({
          id: service.id,
          name: service.name,
          slug: service.slug,
          type: service.type,
          createdAt: service.createdAt,
          updatedAt: service.updatedAt,
        })
        .from(organizationServices)
        .innerJoin(service, eq(organizationServices.serviceId, service.id))
        .where(eq(organizationServices.organizationId, organizationId))

      return this.sortServicesByName(results)
    } catch (error) {
      throw new Error(`Failed to fetch services for organization ${organizationId}`, {
        cause: error,
      })
    }
  }

  async updateOrganizationServices(
    organizationId: string,
    operations: OrganizationServiceOperations
  ): Promise<Service[]> {
    try {
      if (operations.remove && operations.remove.length > 0) {
        await db
          .delete(organizationServices)
          .where(
            and(
              eq(organizationServices.organizationId, organizationId),
              inArray(organizationServices.serviceId, operations.remove)
            )
          )
      }

      if (operations.add && operations.add.length > 0) {
        const newServices = operations.add.map((serviceId) => ({
          organizationId,
          serviceId,
          createdAt: new Date(),
        }))

        try {
          await db.insert(organizationServices).values(newServices)
        } catch (error) {
          console.warn('Some services may already exist for organization:', error)
        }
      }

      return this.getByOrganization(organizationId)
    } catch (error) {
      throw new Error(`Failed to update services for organization ${organizationId}`, {
        cause: error,
      })
    }
  }

  async getWithSelectionStatus(organizationId: string): Promise<ServiceWithSelectionStatus[]> {
    try {
      const [allServices, selectedServices] = await Promise.all([
        this.getAll(),
        this.getByOrganization(organizationId),
      ])

      const selectedServiceIds = new Set(selectedServices.map((s) => s.id))

      return allServices.map((svc) => ({
        ...svc,
        isSelected: selectedServiceIds.has(svc.id),
      }))
    } catch (error) {
      throw new Error(
        `Failed to fetch services with selection status for organization ${organizationId}`,
        { cause: error }
      )
    }
  }

  sortServicesByName<T extends { name: string }>(services: T[]): T[] {
    return sortByName(services)
  }
}
