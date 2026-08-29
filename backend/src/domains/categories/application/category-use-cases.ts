import type {
  Category,
  CategoryWithSelectionStatus,
  OrganizationCategoryOperations,
} from './category-models'
import type { CategoryRepositoryPort } from './ports'

export class ListCategoriesUseCase {
  constructor(private readonly categories: CategoryRepositoryPort) {}

  async execute(command: { organizationId?: string | null } = {}): Promise<Category[]> {
    if (command.organizationId) {
      return await this.categories.getByOrganization(command.organizationId)
    }
    return await this.categories.getAll()
  }
}

export class ListOrganizationCategoriesUseCase {
  constructor(private readonly categories: CategoryRepositoryPort) {}

  async execute(command: { organizationId: string }): Promise<Category[]> {
    return await this.categories.getByOrganization(command.organizationId)
  }
}

export class UpdateOrganizationCategoriesUseCase {
  constructor(private readonly categories: CategoryRepositoryPort) {}

  async execute(command: {
    organizationId: string
    operations: OrganizationCategoryOperations
  }): Promise<Category[]> {
    return await this.categories.updateOrganizationCategories(
      command.organizationId,
      command.operations
    )
  }
}

export class ListCategoriesWithSelectionUseCase {
  constructor(private readonly categories: CategoryRepositoryPort) {}

  async execute(command: { organizationId: string }): Promise<CategoryWithSelectionStatus[]> {
    return await this.categories.getWithSelectionStatus(command.organizationId)
  }
}
