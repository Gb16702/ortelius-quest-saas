import {
  GetActivityScoreUseCase,
  ListActivityEventsUseCase,
  ListActivityEventTypesUseCase,
  LogActivityEventUseCase,
} from '../application/activity-use-cases'
import { DrizzleActivityRepository } from './activity.repository'

export interface ActivityUseCaseContainer {
  logEvent: LogActivityEventUseCase
  listEvents: ListActivityEventsUseCase
  listEventTypes: ListActivityEventTypesUseCase
  getScore: GetActivityScoreUseCase
}

let activityUseCases: ActivityUseCaseContainer | null = null

export function getActivityUseCases(): ActivityUseCaseContainer {
  if (activityUseCases) return activityUseCases

  const activity = new DrizzleActivityRepository()
  activityUseCases = {
    logEvent: new LogActivityEventUseCase(activity),
    listEvents: new ListActivityEventsUseCase(activity),
    listEventTypes: new ListActivityEventTypesUseCase(activity),
    getScore: new GetActivityScoreUseCase(activity),
  }

  return activityUseCases
}
