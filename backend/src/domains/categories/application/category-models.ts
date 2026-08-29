export interface Category {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

export interface CategoryWithSelectionStatus extends Category {
  isSelected: boolean
}

export interface OrganizationCategoryOperations {
  add?: string[]
  remove?: string[]
}
