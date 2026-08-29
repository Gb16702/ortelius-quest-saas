import type {
  ActivityFilters,
  ActivityPage,
  ActivityScore,
  CreateActivityData,
  EventTypeInfo,
} from './application/activity-models'
import { getActivityUseCases } from './infrastructure/activity-use-cases'

export class ActivityApplicationService {
  async logEvent(data: CreateActivityData): Promise<void> {
    try {
      const useCases = getActivityUseCases()
      await useCases.logEvent.execute(data)
    } catch (error) {
      console.error('[Activity] Failed to log event:', data.eventType, error)
    }
  }

  async getEvents(organizationId: string, filters: ActivityFilters): Promise<ActivityPage> {
    const useCases = getActivityUseCases()
    return await useCases.listEvents.execute({ organizationId, filters })
  }

  async getEventTypes(): Promise<EventTypeInfo[]> {
    const useCases = getActivityUseCases()
    return await useCases.listEventTypes.execute()
  }

  async getScore(command: {
    organizationId: string
    actorId: string
    days: number
  }): Promise<ActivityScore> {
    const useCases = getActivityUseCases()
    return await useCases.getScore.execute(command)
  }
}

export const activityApplicationService = new ActivityApplicationService()
