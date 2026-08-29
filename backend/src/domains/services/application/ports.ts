import type {
  OrganizationServiceOperations,
  Service,
  ServiceWithSelectionStatus,
} from './service-models'

export interface ServiceRepositoryPort {
  getAll(): Promise<Service[]>
  getByOrganization(organizationId: string): Promise<Service[]>
  updateOrganizationServices(
    organizationId: string,
    operations: OrganizationServiceOperations
  ): Promise<Service[]>
  getWithSelectionStatus(organizationId: string): Promise<ServiceWithSelectionStatus[]>
}
