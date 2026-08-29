export interface Service {
  id: string
  name: string
  slug: string
  type: 'cargo' | 'storage' | 'logistics' | 'port'
  createdAt: Date
  updatedAt: Date
}

export interface ServiceWithSelectionStatus extends Service {
  isSelected: boolean
}

export interface OrganizationServiceOperations {
  add?: string[]
  remove?: string[]
}
