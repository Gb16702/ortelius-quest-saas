import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'

const job = {
  id: 'job-123',
  status: 'pending' as const,
  totalEmails: 1,
  processed: 0,
  sent: 0,
  failed: 0,
  results: [],
  createdAt: new Date('2026-05-07T00:00:00.000Z'),
}

const eblastService = {
  getAvailableTemplates: mock(async () => [{ name: 'Marketing', value: 'MARKETING' }]),
  listJobs: mock(async () => [job]),
  getJob: mock(async () => job),
  startEblast: mock(async () => job),
}

mock.module('../eblast.application', () => ({
  eblastApplicationService: eblastService,
}))

const { createEblastRoutes } = await import('../presentation/eblast.routes')

function createApp() {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/eblast', createEblastRoutes(eblastService))
  return app
}

describe('Eblast routes', () => {
  beforeEach(() => {
    Object.values(eblastService).forEach((fn) => fn.mockClear())
    eblastService.getJob.mockResolvedValue(job)
  })

  it('lists templates and jobs through the application facade', async () => {
    const templatesResponse = await createApp().request('/eblast/templates')
    const jobsResponse = await createApp().request('/eblast/jobs')

    expect(templatesResponse.status).toBe(200)
    expect(await templatesResponse.json()).toEqual({
      success: true,
      data: { templates: [{ name: 'Marketing', value: 'MARKETING' }] },
    })
    expect(jobsResponse.status).toBe(200)
    expect((await jobsResponse.json()).success).toBe(true)
  })

  it('loads a job and preserves missing job 404s', async () => {
    const response = await createApp().request('/eblast/jobs/job-123')

    eblastService.getJob.mockResolvedValueOnce(undefined)
    const missingResponse = await createApp().request('/eblast/jobs/missing')

    expect(response.status).toBe(200)
    expect((await response.json()).data.id).toBe('job-123')
    expect(missingResponse.status).toBe(404)
    expect(await missingResponse.json()).toEqual({
      success: false,
      code: 'NOT_FOUND',
      message: 'Job not found',
    })
  })

  it('starts an eblast job with the existing response envelope', async () => {
    const response = await createApp().request('/eblast/send', {
      method: 'POST',
      body: JSON.stringify({
        emails: ['ada@example.com'],
        template: 'MARKETING',
        templateProps: {},
        subject: 'Hello',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json()

    expect(response.status).toBe(202)
    expect(json).toEqual({
      success: true,
      data: {
        jobId: 'job-123',
        status: 'pending',
        totalEmails: 1,
      },
      message: 'Eblast job started. Track progress at /eblast/jobs/job-123',
    })
  })
})
