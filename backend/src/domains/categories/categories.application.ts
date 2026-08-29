import type {
  Category,
  CategoryWithSelectionStatus,
  OrganizationCategoryOperations,
} from './application/category-models'
import { getCategoryUseCases } from './infrastructure/category-use-cases'

export class CategoriesApplicationService {
  async getAll(): Promise<Category[]> {
    const useCases = await getCategoryUseCases()
    return await useCases.list.execute()
  }

  async getByOrganization(organizationId: string): Promise<Category[]> {
    const useCases = await getCategoryUseCases()
    return await useCases.listByOrganization.execute({ organizationId })
  }

  async updateOrganizationCategories(
    organizationId: string,
    operations: OrganizationCategoryOperations
  ): Promise<Category[]> {
    const useCases = await getCategoryUseCases()
    return await useCases.updateOrganizationCategories.execute({ organizationId, operations })
  }

  async getWithSelectionStatus(organizationId: string): Promise<CategoryWithSelectionStatus[]> {
    const useCases = await getCategoryUseCases()
    return await useCases.listWithSelection.execute({ organizationId })
  }
}

export const categoriesApplicationService = new CategoriesApplicationService()
