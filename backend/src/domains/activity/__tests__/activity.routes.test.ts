import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context, Next } from 'hono'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { createActivityRoutes } from '../presentation/activity.routes'

const testUser = { id: 'user-123', email: 'test@example.com' }

const event = {
  id: 'activity-1',
  organizationId: 'org-123',
  actorId: 'user-123',
  eventType: 'request-created',
  description: 'created a request',
  metadata: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
}

const activityService = {
  getEvents: mock(() => Promise.resolve({ events: [event], nextCursor: null })),
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
  getScore: mock(() =>
    Promise.resolve({
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
  ),
}

const organizationService = {
  listUserOrganizations: mock(() => Promise.resolve([{ id: 'org-123' }])),
}

async function requireTestAuth(c: Context<{ Variables: CommonVariables }>, next: Next) {
  if (!c.get('user')) {
    return c.json({ success: false, code: 'UNAUTHORIZED', message: 'Authentication required' }, 401)
  }
  await next()
}

function createApp(authenticated = true) {
  const app = new Hono<{ Variables: CommonVariables }>()
  if (authenticated) {
    app.use('*', async (c, next) => {
      c.set('user', testUser)
      await next()
    })
  }
  app.route(
    '/activity',
    createActivityRoutes(activityService, organizationService, requireTestAuth)
  )
  return app
}

describe('Activity routes', () => {
  beforeEach(() => {
    Object.values(activityService).forEach((fn) => fn.mockClear())
    Object.values(organizationService).forEach((fn) => fn.mockClear())
    activityService.getEvents.mockResolvedValue({ events: [event], nextCursor: null })
    activityService.getEventTypes.mockResolvedValue([
      {
        type: 'request-created',
        key: 'request-created',
        label: 'Request created',
        description: 'A new request was created.',
      },
    ])
    activityService.getScore.mockResolvedValue({
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
    organizationService.listUserOrganizations.mockResolvedValue([{ id: 'org-123' }])
  })

  it('requires authentication', async () => {
    const response = await createApp(false).request('/activity')

    expect(response.status).toBe(401)
  })

  it('returns an empty page when the user has no organizations', async () => {
    organizationService.listUserOrganizations.mockResolvedValue([])

    const response = await createApp().request('/activity')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, data: { events: [], nextCursor: null } })
    expect(activityService.getEvents).not.toHaveBeenCalled()
  })

  it('lists activity events for the first user organization', async () => {
    const response = await createApp().request(
      '/activity?actorId=user-123&eventTypes=request-created,quote-created&limit=10'
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.events).toMatchObject([{ id: 'activity-1' }])
    expect(activityService.getEvents).toHaveBeenCalledWith('org-123', {
      actorId: 'user-123',
      eventTypes: ['request-created', 'quote-created'],
      fromDate: undefined,
      toDate: undefined,
      cursor: undefined,
      limit: 10,
    })
  })

  it('returns an activity score for the requested user organization', async () => {
    organizationService.listUserOrganizations.mockResolvedValue([
      { id: 'org-123' },
      { id: 'org-2' },
    ])

    const response = await createApp().request(
      '/activity/score?organizationId=org-2&actorId=user-123&days=30'
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: {
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
      },
    })
    expect(activityService.getScore).toHaveBeenCalledWith({
      organizationId: 'org-2',
      actorId: 'user-123',
      days: 30,
    })
  })

  it('rejects activity score requests for organizations outside the user scope', async () => {
    const response = await createApp().request(
      '/activity/score?organizationId=other-org&actorId=user-123&days=30'
    )
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: 'Insufficient organization permissions',
    })
    expect(activityService.getScore).not.toHaveBeenCalled()
  })

  it('lists event types', async () => {
    const response = await createApp().request('/activity/event-types')
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual([
      {
        type: 'request-created',
        key: 'request-created',
        label: 'Request created',
        description: 'A new request was created.',
      },
    ])
    expect(activityService.getEventTypes).toHaveBeenCalledTimes(1)
  })
})
