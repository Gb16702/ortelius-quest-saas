import type { ServiceRepositoryPort } from './ports'
import type {
  OrganizationServiceOperations,
  Service,
  ServiceWithSelectionStatus,
} from './service-models'

export class ListServicesUseCase {
  constructor(private readonly services: ServiceRepositoryPort) {}

  async execute(command: { organizationId?: string | null } = {}): Promise<Service[]> {
    if (command.organizationId) {
      return await this.services.getByOrganization(command.organizationId)
    }
    return await this.services.getAll()
  }
}

export class ListOrganizationServicesUseCase {
  constructor(private readonly services: ServiceRepositoryPort) {}

  async execute(command: { organizationId: string }): Promise<Service[]> {
    return await this.services.getByOrganization(command.organizationId)
  }
}

export class UpdateOrganizationServicesUseCase {
  constructor(private readonly services: ServiceRepositoryPort) {}

  async execute(command: {
    organizationId: string
    operations: OrganizationServiceOperations
  }): Promise<Service[]> {
    return await this.services.updateOrganizationServices(
      command.organizationId,
      command.operations
    )
  }
}

export class ListServicesWithSelectionUseCase {
  constructor(private readonly services: ServiceRepositoryPort) {}

  async execute(command: { organizationId: string }): Promise<ServiceWithSelectionStatus[]> {
    return await this.services.getWithSelectionStatus(command.organizationId)
  }
}
