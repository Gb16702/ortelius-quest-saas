import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  GetActivityScoreUseCase,
  ListActivityEventsUseCase,
  ListActivityEventTypesUseCase,
  LogActivityEventUseCase,
} from '../application/activity-use-cases'

const event = {
  id: 'activity-1',
  organizationId: 'org-123',
  actorId: 'user-123',
  eventType: 'request-created',
  description: 'created a request',
  metadata: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
}

const repository = {
  create: mock(() => Promise.resolve(event)),
  getByOrganization: mock(() => Promise.resolve({ events: [event], nextCursor: null })),
  getScoreBreakdown: mock(() =>
    Promise.resolve([
      { eventType: 'quote-created', count: 2, points: 24 },
      { eventType: 'invoice-created', count: 1, points: 14 },
    ])
  ),
  getEventTypes: mock(() =>
    Promise.resolve([
      {
        type: 'request-created',
        key: 'request-created',
        label: 'Request created',
        description: 'A new request was created.',
      },
    ])
  ),
}

describe('Activity use cases', () => {
  beforeEach(() => {
    Object.values(repository).forEach((fn) => fn.mockClear())
  })

  it('logs activity events through the repository port', async () => {
    const data = {
      organizationId: 'org-123',
      actorId: 'user-123',
      eventType: 'request-created',
      description: 'created a request',
      metadata: { requestId: 'request-1' },
    }

    await expect(new LogActivityEventUseCase(repository).execute(data)).resolves.toEqual(event)

    expect(repository.create).toHaveBeenCalledWith(data)
  })

  it('lists activity events through the repository port', async () => {
    const filters = { actorId: 'user-123', limit: 10 }

    await expect(
      new ListActivityEventsUseCase(repository).execute({
        organizationId: 'org-123',
        filters,
      })
    ).resolves.toEqual({ events: [event], nextCursor: null })

    expect(repository.getByOrganization).toHaveBeenCalledWith('org-123', filters)
  })

  it('lists event type metadata through the repository port', async () => {
    await expect(new ListActivityEventTypesUseCase(repository).execute()).resolves.toEqual([
      {
        type: 'request-created',
        key: 'request-created',
        label: 'Request created',
        description: 'A new request was created.',
      },
    ])

    expect(repository.getEventTypes).toHaveBeenCalledTimes(1)
  })

  it('calculates an activity score from current and previous weighted breakdowns', async () => {
    repository.getScoreBreakdown
      .mockResolvedValueOnce([
        { eventType: 'quote-created', count: 2, points: 24 },
        { eventType: 'invoice-created', count: 1, points: 14 },
      ])
      .mockResolvedValueOnce([{ eventType: 'request-updated', count: 3, points: 9 }])

    await expect(
      new GetActivityScoreUseCase(repository).execute({
        organizationId: 'org-123',
        actorId: 'user-123',
        days: 30,
        now: new Date('2026-06-08T12:00:00.000Z'),
      })
    ).resolves.toEqual({
      score: 32,
      previousScore: 8,
      totalPoints: 38,
      previousTotalPoints: 9,
      targetPoints: 120,
      periodDays: 30,
      breakdown: [
        { eventType: 'quote-created', count: 2, points: 24 },
        { eventType: 'invoice-created', count: 1, points: 14 },
      ],
    })

    expect(repository.getScoreBreakdown).toHaveBeenNthCalledWith(1, 'org-123', {
      actorId: 'user-123',
      fromDate: new Date('2026-05-09T12:00:00.000Z'),
      toDate: new Date('2026-06-08T12:00:00.000Z'),
    })
    expect(repository.getScoreBreakdown).toHaveBeenNthCalledWith(2, 'org-123', {
      actorId: 'user-123',
      fromDate: new Date('2026-04-09T12:00:00.000Z'),
      toDate: new Date('2026-05-09T12:00:00.000Z'),
    })
  })
})
