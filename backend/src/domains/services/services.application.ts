import type {
  OrganizationServiceOperations,
  Service,
  ServiceWithSelectionStatus,
} from './application/service-models'
import { getServiceUseCases } from './infrastructure/service-use-cases'

export class ServicesApplicationService {
  async getAll(): Promise<Service[]> {
    const useCases = await getServiceUseCases()
    return await useCases.list.execute()
  }

  async getByOrganization(organizationId: string): Promise<Service[]> {
    const useCases = await getServiceUseCases()
    return await useCases.listByOrganization.execute({ organizationId })
  }

  async updateOrganizationServices(
    organizationId: string,
    operations: OrganizationServiceOperations
  ): Promise<Service[]> {
    const useCases = await getServiceUseCases()
    return await useCases.updateOrganizationServices.execute({ organizationId, operations })
  }

  async getWithSelectionStatus(organizationId: string): Promise<ServiceWithSelectionStatus[]> {
    const useCases = await getServiceUseCases()
    return await useCases.listWithSelection.execute({ organizationId })
  }
}

export const servicesApplicationService = new ServicesApplicationService()
