import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  ListOrganizationServicesUseCase,
  ListServicesUseCase,
  ListServicesWithSelectionUseCase,
  UpdateOrganizationServicesUseCase,
} from '../application/service-use-cases'

const services = [
  {
    id: 'service-1',
    name: 'Cargo',
    slug: 'cargo',
    type: 'cargo' as const,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  },
]

const repository = {
  getAll: mock(() => Promise.resolve(services)),
  getByOrganization: mock(() => Promise.resolve(services)),
  updateOrganizationServices: mock(() => Promise.resolve(services)),
  getWithSelectionStatus: mock(() =>
    Promise.resolve(services.map((service) => ({ ...service, isSelected: true })))
  ),
}

describe('Service use cases', () => {
  beforeEach(() => {
    Object.values(repository).forEach((fn) => fn.mockClear())
  })

  it('lists all services or the services selected by an organization', async () => {
    await expect(new ListServicesUseCase(repository).execute()).resolves.toEqual(services)
    await expect(
      new ListServicesUseCase(repository).execute({ organizationId: 'org-123' })
    ).resolves.toEqual(services)

    expect(repository.getAll).toHaveBeenCalledTimes(1)
    expect(repository.getByOrganization).toHaveBeenCalledWith('org-123')
  })

  it('loads organization services through the repository port', async () => {
    await expect(
      new ListOrganizationServicesUseCase(repository).execute({ organizationId: 'org-123' })
    ).resolves.toEqual(services)

    expect(repository.getByOrganization).toHaveBeenCalledWith('org-123')
  })

  it('updates organization services through the repository port', async () => {
    const operations = { add: ['service-1'], remove: ['service-2'] }

    await expect(
      new UpdateOrganizationServicesUseCase(repository).execute({
        organizationId: 'org-123',
        operations,
      })
    ).resolves.toEqual(services)

    expect(repository.updateOrganizationServices).toHaveBeenCalledWith('org-123', operations)
  })

  it('loads service selection status through the repository port', async () => {
    await expect(
      new ListServicesWithSelectionUseCase(repository).execute({ organizationId: 'org-123' })
    ).resolves.toEqual([{ ...services[0], isSelected: true }])

    expect(repository.getWithSelectionStatus).toHaveBeenCalledWith('org-123')
  })
})
