import type {
  ActivityEvent,
  ActivityFilters,
  ActivityPage,
  ActivityScoreBreakdownItem,
  ActivityScoreFilters,
  CreateActivityData,
  EventTypeInfo,
} from './activity-models'

export interface ActivityRepositoryPort {
  create(data: CreateActivityData): Promise<ActivityEvent>
  getByOrganization(organizationId: string, filters?: ActivityFilters): Promise<ActivityPage>
  getScoreBreakdown(
    organizationId: string,
    filters: ActivityScoreFilters
  ): Promise<ActivityScoreBreakdownItem[]>
  getEventTypes(): Promise<EventTypeInfo[]>
}
