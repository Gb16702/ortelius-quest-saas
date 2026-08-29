import { describe, expect, it } from 'bun:test'
import type { AssistantMessageRunJob } from '../infrastructure/assistant-message-runner'
import {
  type AssistantRunQueueRedisClient,
  RedisAssistantRunQueue,
} from '../infrastructure/assistant-run-queue'

class FakeAssistantRunQueueRedisClient implements AssistantRunQueueRedisClient {
  readonly lists = new Map<string, string[]>()
  readonly sets = new Map<string, Set<string>>()
  readonly values = new Map<string, string>()

  async eval(_script: string, numberOfKeys: number, ...args: string[]): Promise<unknown> {
    const keys = args.slice(0, numberOfKeys)
    const scriptArgs = args.slice(numberOfKeys)
    const [activeKey, jobKey, runKey, queueKey] = keys
    const [jobId, payload] = scriptArgs

    if (!activeKey || !jobKey || !runKey || !queueKey || !jobId || !payload) {
      throw new Error('Invalid fake Redis eval call')
    }

    const activeJobs = this.getSet(activeKey)
    if (activeJobs.has(jobId)) return 0

    activeJobs.add(jobId)
    this.values.set(jobKey, payload)
    this.values.set(runKey, JSON.parse(payload).runId ? jobId : '')
    await this.lpush(queueKey, jobId)
    return 1
  }

  async lpush(key: string, value: string): Promise<number> {
    const list = this.getList(key)
    list.unshift(value)
    return list.length
  }

  async brpoplpush(source: string, destination: string): Promise<string | null> {
    return this.rpoplpush(source, destination)
  }

  async rpoplpush(source: string, destination: string): Promise<string | null> {
    const sourceList = this.getList(source)
    const value = sourceList.pop()
    if (!value) return null

    this.getList(destination).unshift(value)
    return value
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    const list = this.getList(key)
    let removedCount = 0

    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (list[index] !== value) continue

      list.splice(index, 1)
      removedCount += 1

      if (count > 0 && removedCount >= count) break
    }

    return removedCount
  }

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.values.set(key, value)
    return 'OK'
  }

  async del(key: string): Promise<number> {
    const existed = this.values.delete(key)
    return existed ? 1 : 0
  }

  async srem(key: string, value: string): Promise<number> {
    const set = this.getSet(key)
    const existed = set.delete(value)
    return existed ? 1 : 0
  }

  private getList(key: string): string[] {
    const existing = this.lists.get(key)
    if (existing) return existing

    const list: string[] = []
    this.lists.set(key, list)
    return list
  }

  private getSet(key: string): Set<string> {
    const existing = this.sets.get(key)
    if (existing) return existing

    const set = new Set<string>()
    this.sets.set(key, set)
    return set
  }
}

function createJob(overrides: Partial<AssistantMessageRunJob> = {}): AssistantMessageRunJob {
  return {
    id: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
    body: {
      conversationId: 'conversation-1',
      userMessageId: '63516c47-1156-44db-b517-48682d1bd4b1',
      assistantMessageId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
      message: 'Where can I update the organization tagline?',
      context: {
        organizationId: 'org-123',
        routePath: '/org/acme/settings/branding',
      },
    },
    conversationId: 'conversation-1',
    partId: '77a68396-882f-4bc2-ae3b-ac79d6933e39',
    runId: '4335033f-ece8-420f-a727-6d62a7c91df26',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      role: 'member',
    },
    createdAt: '2026-06-10T10:02:00.000Z',
    ...overrides,
  }
}

describe('RedisAssistantRunQueue', () => {
  it('keeps enqueue idempotent by active assistant message id', async () => {
    const redis = new FakeAssistantRunQueueRedisClient()
    const queue = new RedisAssistantRunQueue(redis)
    const firstJob = createJob()

    await queue.enqueue(firstJob)
    await queue.enqueue(
      createJob({
        runId: '11111111-1111-4111-8111-111111111111',
      })
    )

    expect(redis.lists.get('assistant:runs:pending')).toEqual([
      '77a68396-882f-4bc2-ae3b-ac79d6933e39',
    ])
    expect(redis.sets.get('assistant:runs:active')).toEqual(
      new Set(['77a68396-882f-4bc2-ae3b-ac79d6933e39'])
    )

    const storedPayload = redis.values.get(
      'assistant:runs:job:77a68396-882f-4bc2-ae3b-ac79d6933e39'
    )
    expect(storedPayload).toBeDefined()
    expect(JSON.parse(storedPayload ?? '{}')).toMatchObject({
      id: firstJob.id,
      runId: firstJob.runId,
      attempts: 0,
    })
  })

  it('cancels a pending run by run id', async () => {
    const redis = new FakeAssistantRunQueueRedisClient()
    const queue = new RedisAssistantRunQueue(redis)
    const job = createJob()

    await queue.enqueue(job)
    const result = await queue.cancelRun({ runId: job.runId, userId: job.user.id })

    expect(result).toEqual({
      status: 'cancelled',
      conversationId: job.conversationId,
      runId: job.runId,
      source: 'pending',
    })
    expect(redis.lists.get('assistant:runs:pending')).toEqual([])
    expect(redis.values.get(`assistant:runs:job:${job.id}`)).toBeUndefined()
    expect(redis.values.get(`assistant:runs:run:${job.runId}`)).toBeUndefined()
  })

  it('marks a processing run as cancelled for the worker', async () => {
    const redis = new FakeAssistantRunQueueRedisClient()
    const queue = new RedisAssistantRunQueue(redis)
    const job = createJob()

    await queue.enqueue(job)
    await redis.rpoplpush('assistant:runs:pending', 'assistant:runs:processing')

    const result = await queue.cancelRun({ runId: job.runId, userId: job.user.id })

    expect(result).toEqual({
      status: 'cancelled',
      conversationId: job.conversationId,
      runId: job.runId,
      source: 'processing',
    })
    expect(await queue.isRunCancelled({ runId: job.runId, userId: job.user.id })).toBe(true)
  })
})
