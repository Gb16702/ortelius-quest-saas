import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  ListCategoriesUseCase,
  ListCategoriesWithSelectionUseCase,
  ListOrganizationCategoriesUseCase,
  UpdateOrganizationCategoriesUseCase,
} from '../application/category-use-cases'

const categories = [
  {
    id: 'category-1',
    name: 'Cargo',
    slug: 'cargo',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  },
]

const repository = {
  getAll: mock(() => Promise.resolve(categories)),
  getByOrganization: mock(() => Promise.resolve(categories)),
  updateOrganizationCategories: mock(() => Promise.resolve(categories)),
  getWithSelectionStatus: mock(() =>
    Promise.resolve(categories.map((category) => ({ ...category, isSelected: true })))
  ),
}

describe('Category use cases', () => {
  beforeEach(() => {
    Object.values(repository).forEach((fn) => fn.mockClear())
  })

  it('lists all categories or the categories selected by an organization', async () => {
    await expect(new ListCategoriesUseCase(repository).execute()).resolves.toEqual(categories)
    await expect(
      new ListCategoriesUseCase(repository).execute({ organizationId: 'org-123' })
    ).resolves.toEqual(categories)

    expect(repository.getAll).toHaveBeenCalledTimes(1)
    expect(repository.getByOrganization).toHaveBeenCalledWith('org-123')
  })

  it('loads organization categories through the repository port', async () => {
    await expect(
      new ListOrganizationCategoriesUseCase(repository).execute({ organizationId: 'org-123' })
    ).resolves.toEqual(categories)

    expect(repository.getByOrganization).toHaveBeenCalledWith('org-123')
  })

  it('updates organization categories through the repository port', async () => {
    const operations = { add: ['category-1'], remove: ['category-2'] }

    await expect(
      new UpdateOrganizationCategoriesUseCase(repository).execute({
        organizationId: 'org-123',
        operations,
      })
    ).resolves.toEqual(categories)

    expect(repository.updateOrganizationCategories).toHaveBeenCalledWith('org-123', operations)
  })

  it('loads category selection status through the repository port', async () => {
    await expect(
      new ListCategoriesWithSelectionUseCase(repository).execute({ organizationId: 'org-123' })
    ).resolves.toEqual([{ ...categories[0], isSelected: true }])

    expect(repository.getWithSelectionStatus).toHaveBeenCalledWith('org-123')
  })
})
