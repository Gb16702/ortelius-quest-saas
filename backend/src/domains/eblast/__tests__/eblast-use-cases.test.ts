import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  GetEblastJobUseCase,
  ListEblastJobsUseCase,
  ListEblastTemplatesUseCase,
  StartEblastUseCase,
} from '../application/eblast-use-cases'

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

const processor = {
  startEblast: mock(() => job),
  getJob: mock(() => job),
  listJobs: mock(() => [job]),
  getAvailableTemplates: mock(() => [{ name: 'Marketing', value: 'MARKETING' }]),
}

describe('Eblast use cases', () => {
  beforeEach(() => {
    Object.values(processor).forEach((fn) => fn.mockClear())
  })

  it('starts an eblast through the processor port', () => {
    const request = {
      emails: ['ada@example.com'],
      template: 'MARKETING',
      templateProps: {},
      subject: 'Hello',
    }

    expect(new StartEblastUseCase(processor).execute(request)).toEqual(job)
    expect(processor.startEblast).toHaveBeenCalledWith(request)
  })

  it('gets, lists, and lists templates through the processor port', () => {
    expect(new GetEblastJobUseCase(processor).execute({ jobId: 'job-123' })).toEqual(job)
    expect(new ListEblastJobsUseCase(processor).execute()).toEqual([job])
    expect(new ListEblastTemplatesUseCase(processor).execute()).toEqual([
      { name: 'Marketing', value: 'MARKETING' },
    ])
  })
})
