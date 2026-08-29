import {
  ListOrganizationServicesUseCase,
  ListServicesUseCase,
  ListServicesWithSelectionUseCase,
  UpdateOrganizationServicesUseCase,
} from '../application/service-use-cases'
import { DrizzleServiceRepository } from './service.repository'

export interface ServiceUseCaseContainer {
  list: ListServicesUseCase
  listByOrganization: ListOrganizationServicesUseCase
  updateOrganizationServices: UpdateOrganizationServicesUseCase
  listWithSelection: ListServicesWithSelectionUseCase
}

let serviceUseCases: ServiceUseCaseContainer | null = null

export async function getServiceUseCases(): Promise<ServiceUseCaseContainer> {
  if (serviceUseCases) return serviceUseCases

  const services = new DrizzleServiceRepository()
  serviceUseCases = {
    list: new ListServicesUseCase(services),
    listByOrganization: new ListOrganizationServicesUseCase(services),
    updateOrganizationServices: new UpdateOrganizationServicesUseCase(services),
    listWithSelection: new ListServicesWithSelectionUseCase(services),
  }

  return serviceUseCases
}
