export interface ActivityEvent {
  id: string
  organizationId: string
  actorId: string | null
  eventType: string
  description: string
  metadata: Record<string, unknown> | null
  createdAt: Date
  actor?: {
    id: string
    name: string
    image: string | null
  } | null
  mentionedUserIsFormerMember?: boolean
}

export interface CreateActivityData {
  organizationId: string
  actorId: string | null
  eventType: string
  description: string
  metadata?: Record<string, unknown>
}

export interface ActivityFilters {
  organizationId?: string
  actorId?: string
  eventTypes?: string[]
  fromDate?: Date
  toDate?: Date
  cursor?: string
  limit?: number
}

export interface ActivityPage {
  events: ActivityEvent[]
  nextCursor: string | null
}

export interface EventTypeInfo {
  type: string
  key: string
  label: string
  description: string
}

export interface ActivityScoreBreakdownItem {
  eventType: string
  count: number
  points: number
}

export interface ActivityScore {
  score: number
  previousScore: number
  totalPoints: number
  previousTotalPoints: number
  targetPoints: number
  periodDays: number
  breakdown: ActivityScoreBreakdownItem[]
}

export interface ActivityScoreFilters {
  actorId: string
  fromDate: Date
  toDate: Date
}
