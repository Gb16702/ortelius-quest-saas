import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { category } from '../../../infrastructure/database/db/schemas/category-schema'
import { organizationCategories } from '../../../infrastructure/database/db/schemas/organization-categories-schema'
import type {
  Category,
  CategoryWithSelectionStatus,
  OrganizationCategoryOperations,
} from '../application/category-models'
import type { CategoryRepositoryPort } from '../application/ports'
import { sortByName } from '../domain'

export class DrizzleCategoryRepository implements CategoryRepositoryPort {
  async getAll(): Promise<Category[]> {
    try {
      const categories = await db.select().from(category)
      return this.sortCategoriesByName(categories)
    } catch (error) {
      throw new Error('Failed to fetch categories', { cause: error })
    }
  }

  async getByOrganization(organizationId: string): Promise<Category[]> {
    try {
      const results = await db
        .select({
          id: category.id,
          name: category.name,
          slug: category.slug,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        })
        .from(organizationCategories)
        .innerJoin(category, eq(organizationCategories.categoryId, category.id))
        .where(eq(organizationCategories.organizationId, organizationId))

      return this.sortCategoriesByName(results)
    } catch (error) {
      throw new Error(`Failed to fetch categories for organization ${organizationId}`, {
        cause: error,
      })
    }
  }

  async updateOrganizationCategories(
    organizationId: string,
    operations: OrganizationCategoryOperations
  ): Promise<Category[]> {
    try {
      if (operations.remove && operations.remove.length > 0) {
        await db
          .delete(organizationCategories)
          .where(
            and(
              eq(organizationCategories.organizationId, organizationId),
              inArray(organizationCategories.categoryId, operations.remove)
            )
          )
      }

      if (operations.add && operations.add.length > 0) {
        const newCategories = operations.add.map((categoryId) => ({
          organizationId,
          categoryId,
          createdAt: new Date(),
        }))

        try {
          await db.insert(organizationCategories).values(newCategories)
        } catch (error) {
          console.warn('Some categories may already exist for organization:', error)
        }
      }

      return this.getByOrganization(organizationId)
    } catch (error) {
      throw new Error(`Failed to update categories for organization ${organizationId}`, {
        cause: error,
      })
    }
  }

  async getWithSelectionStatus(organizationId: string): Promise<CategoryWithSelectionStatus[]> {
    try {
      const [allCategories, selectedCategories] = await Promise.all([
        this.getAll(),
        this.getByOrganization(organizationId),
      ])

      const selectedCategoryIds = new Set(selectedCategories.map((c) => c.id))

      return allCategories.map((cat) => ({
        ...cat,
        isSelected: selectedCategoryIds.has(cat.id),
      }))
    } catch (error) {
      throw new Error(
        `Failed to fetch categories with selection status for organization ${organizationId}`,
        { cause: error }
      )
    }
  }

  sortCategoriesByName<T extends { name: string }>(categories: T[]): T[] {
    return sortByName(categories)
  }
}
