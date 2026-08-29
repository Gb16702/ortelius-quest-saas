import {
  ListCategoriesUseCase,
  ListCategoriesWithSelectionUseCase,
  ListOrganizationCategoriesUseCase,
  UpdateOrganizationCategoriesUseCase,
} from '../application/category-use-cases'
import { DrizzleCategoryRepository } from './category.repository'

export interface CategoryUseCaseContainer {
  list: ListCategoriesUseCase
  listByOrganization: ListOrganizationCategoriesUseCase
  updateOrganizationCategories: UpdateOrganizationCategoriesUseCase
  listWithSelection: ListCategoriesWithSelectionUseCase
}

let categoryUseCases: CategoryUseCaseContainer | null = null

export async function getCategoryUseCases(): Promise<CategoryUseCaseContainer> {
  if (categoryUseCases) return categoryUseCases

  const categories = new DrizzleCategoryRepository()
  categoryUseCases = {
    list: new ListCategoriesUseCase(categories),
    listByOrganization: new ListOrganizationCategoriesUseCase(categories),
    updateOrganizationCategories: new UpdateOrganizationCategoriesUseCase(categories),
    listWithSelection: new ListCategoriesWithSelectionUseCase(categories),
  }

  return categoryUseCases
}
