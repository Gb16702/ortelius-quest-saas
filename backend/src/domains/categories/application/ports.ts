import type {
  Category,
  CategoryWithSelectionStatus,
  OrganizationCategoryOperations,
} from './category-models'

export interface CategoryRepositoryPort {
  getAll(): Promise<Category[]>
  getByOrganization(organizationId: string): Promise<Category[]>
  updateOrganizationCategories(
    organizationId: string,
    operations: OrganizationCategoryOperations
  ): Promise<Category[]>
  getWithSelectionStatus(organizationId: string): Promise<CategoryWithSelectionStatus[]>
}
