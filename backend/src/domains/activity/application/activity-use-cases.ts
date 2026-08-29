import { calculateActivityScore, getActivityScoreTargetPoints } from '../domain'
import type {
  ActivityEvent,
  ActivityFilters,
  ActivityPage,
  ActivityScore,
  CreateActivityData,
  EventTypeInfo,
} from './activity-models'
import type { ActivityRepositoryPort } from './ports'

export class LogActivityEventUseCase {
  constructor(private readonly activity: ActivityRepositoryPort) {}

  async execute(data: CreateActivityData): Promise<ActivityEvent> {
    return await this.activity.create(data)
  }
}

export class ListActivityEventsUseCase {
  constructor(private readonly activity: ActivityRepositoryPort) {}

  async execute(command: {
    organizationId: string
    filters?: ActivityFilters
  }): Promise<ActivityPage> {
    return await this.activity.getByOrganization(command.organizationId, command.filters)
  }
}

export class ListActivityEventTypesUseCase {
  constructor(private readonly activity: ActivityRepositoryPort) {}

  async execute(): Promise<EventTypeInfo[]> {
    return await this.activity.getEventTypes()
  }
}

export class GetActivityScoreUseCase {
  constructor(private readonly activity: ActivityRepositoryPort) {}

  async execute(command: {
    organizationId: string
    actorId: string
    days: number
    now?: Date
  }): Promise<ActivityScore> {
    const now = command.now ?? new Date()
    const currentFromDate = subtractDays(now, command.days)
    const previousFromDate = subtractDays(currentFromDate, command.days)

    const [breakdown, previousBreakdown] = await Promise.all([
      this.activity.getScoreBreakdown(command.organizationId, {
        actorId: command.actorId,
        fromDate: currentFromDate,
        toDate: now,
      }),
      this.activity.getScoreBreakdown(command.organizationId, {
        actorId: command.actorId,
        fromDate: previousFromDate,
        toDate: currentFromDate,
      }),
    ])

    const totalPoints = sumPoints(breakdown)
    const previousTotalPoints = sumPoints(previousBreakdown)

    return {
      score: calculateActivityScore(totalPoints, command.days),
      previousScore: calculateActivityScore(previousTotalPoints, command.days),
      totalPoints,
      previousTotalPoints,
      targetPoints: getActivityScoreTargetPoints(command.days),
      periodDays: command.days,
      breakdown,
    }
  }
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 86_400_000)
}

function sumPoints(breakdown: ReadonlyArray<{ points: number }>): number {
  return breakdown.reduce((sum, item) => sum + item.points, 0)
}
