import { z } from 'zod'
import { redisService } from '../../../infrastructure/cache/redis.service'
import { assistantMessageRequestSchema } from '../presentation/assistant.schemas'
import type { AssistantMessageRunJob } from './assistant-message-runner'
import type { AssistantRunCancellationResult } from './assistant-run-cancellation'

export interface AssistantRunQueueRedisClient {
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>
  lpush(key: string, value: string): Promise<number>
  brpoplpush(source: string, destination: string, timeout: number): Promise<string | null>
  rpoplpush(source: string, destination: string): Promise<string | null>
  lrem(key: string, count: number, value: string): Promise<number>
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<'OK' | null>
  del(key: string): Promise<number>
  srem(key: string, value: string): Promise<number>
}

const assistantRunJobSchema = z.object({
  id: z.string().min(1),
  body: assistantMessageRequestSchema,
  conversationId: z.string().min(1),
  partId: z.string().min(1),
  runId: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    email: z.string(),
    name: z.string(),
    image: z.string().nullable(),
    role: z.string(),
  }),
  createdAt: z.string(),
  attempts: z.number().int().min(0).optional(),
})

type AssistantRunQueuePayload = z.infer<typeof assistantRunJobSchema>
type AssistantRunQueueProcessor = (job: AssistantMessageRunJob) => Promise<void>

export interface AssistantRunQueuePort {
  enqueue(job: AssistantMessageRunJob): Promise<void>
  cancelRun(input: { runId: string; userId: string }): Promise<AssistantRunCancellationResult>
  clearCancelledRun(runId: string): Promise<void>
  isRunCancelled(input: { runId: string; userId: string }): Promise<boolean>
}

export class RedisAssistantRunQueue implements AssistantRunQueuePort {
  private readonly queueKey = 'assistant:runs:pending'
  private readonly processingKey = 'assistant:runs:processing'
  private readonly activeKey = 'assistant:runs:active'
  private readonly jobKeyPrefix = 'assistant:runs:job'
  private readonly runKeyPrefix = 'assistant:runs:run'
  private readonly cancelledRunKeyPrefix = 'assistant:runs:cancelled'
  private readonly maxAttempts = 3
  private redisClient: AssistantRunQueueRedisClient | null = null
  private blockingRedisClient: AssistantRunQueueRedisClient | null = null
  private isProcessing = false

  constructor(
    redisClient?: AssistantRunQueueRedisClient,
    blockingRedisClient?: AssistantRunQueueRedisClient
  ) {
    this.redisClient = redisClient ?? null
    this.blockingRedisClient = blockingRedisClient ?? redisClient ?? null
  }

  async enqueue(job: AssistantMessageRunJob): Promise<void> {
    await this.getRedisClient().eval(
      `
      if redis.call("SADD", KEYS[1], ARGV[1]) == 1 then
        redis.call("SET", KEYS[2], ARGV[2])
        redis.call("SET", KEYS[3], ARGV[1])
        redis.call("LPUSH", KEYS[4], ARGV[1])
        return 1
      end
      return 0
      `,
      4,
      this.activeKey,
      this.getJobKey(job.id),
      this.getRunKey(job.runId),
      this.queueKey,
      job.id,
      JSON.stringify({ ...job, attempts: 0 })
    )
  }

  async cancelRun(input: {
    runId: string
    userId: string
  }): Promise<AssistantRunCancellationResult> {
    const jobId = await this.getRedisClient().get(this.getRunKey(input.runId))
    if (!jobId) return { status: 'not_found' }

    const payload = await this.getRedisClient().get(this.getJobKey(jobId))
    const parsedJob = parseAssistantRunQueuePayload(payload)
    if (!parsedJob) return { status: 'not_found' }

    if (parsedJob.user.id !== input.userId) {
      return { status: 'forbidden' }
    }

    await this.getRedisClient().set(
      this.getCancelledRunKey(input.runId),
      JSON.stringify({
        conversationId: parsedJob.conversationId,
        runId: parsedJob.runId,
        userId: parsedJob.user.id,
      })
    )

    const pendingRemoved = await this.getRedisClient().lrem(this.queueKey, 0, jobId)
    await this.getRedisClient().lrem(this.processingKey, 0, jobId)

    if (pendingRemoved > 0) {
      await this.cleanupPendingCancelledJob(parsedJob)

      return {
        status: 'cancelled',
        conversationId: parsedJob.conversationId,
        runId: parsedJob.runId,
        source: 'pending',
      }
    }

    return {
      status: 'cancelled',
      conversationId: parsedJob.conversationId,
      runId: parsedJob.runId,
      source: 'processing',
    }
  }

  async isRunCancelled(input: { runId: string; userId: string }): Promise<boolean> {
    const payload = await this.getRedisClient().get(this.getCancelledRunKey(input.runId))
    if (!payload) return false

    try {
      const parsed: unknown = JSON.parse(payload)
      return (
        typeof parsed === 'object' &&
        parsed !== null &&
        'userId' in parsed &&
        parsed.userId === input.userId
      )
    } catch {
      return false
    }
  }

  async clearCancelledRun(runId: string): Promise<void> {
    await this.getRedisClient().del(this.getCancelledRunKey(runId))
  }

  startProcessor(processor: AssistantRunQueueProcessor): void {
    if (this.isProcessing) return

    this.isProcessing = true
    void this.processJobs(processor)
  }

  async stopProcessor(): Promise<void> {
    this.isProcessing = false
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  private async processJobs(processor: AssistantRunQueueProcessor): Promise<void> {
    try {
      await this.recoverProcessingJobs()

      while (this.isProcessing) {
        const jobId = await this.getBlockingRedisClient().brpoplpush(
          this.queueKey,
          this.processingKey,
          5
        )
        if (!jobId) continue

        await this.processJobId(jobId, processor)
      }
    } catch (error) {
      console.error('Error in assistant run processor:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processJobId(jobId: string, processor: AssistantRunQueueProcessor): Promise<void> {
    const payload = await this.getRedisClient().get(this.getJobKey(jobId))
    const parsedJob = parseAssistantRunQueuePayload(payload)

    if (!parsedJob) {
      await this.cleanupJob(jobId)
      return
    }

    try {
      await processor(toAssistantMessageRunJob(parsedJob))
      await this.cleanupJob(jobId)
    } catch (error) {
      console.error(`Assistant run job failed: ${parsedJob.id}`, error)
      await this.retryOrDiscardJob(jobId, parsedJob)
    }
  }

  private async retryOrDiscardJob(jobId: string, job: AssistantRunQueuePayload): Promise<void> {
    const nextAttempts = (job.attempts ?? 0) + 1

    await this.getRedisClient().lrem(this.processingKey, 1, jobId)

    if (nextAttempts >= this.maxAttempts) {
      console.error(`Assistant run job discarded after ${nextAttempts} attempts: ${job.id}`)
      await this.getRedisClient().del(this.getJobKey(jobId))
      await this.getRedisClient().del(this.getRunKey(job.runId))
      await this.getRedisClient().del(this.getCancelledRunKey(job.runId))
      await this.getRedisClient().srem(this.activeKey, jobId)
      return
    }

    await this.getRedisClient().set(
      this.getJobKey(jobId),
      JSON.stringify({
        ...job,
        attempts: nextAttempts,
      })
    )
    await this.getRedisClient().lpush(this.queueKey, jobId)
  }

  private async recoverProcessingJobs(): Promise<void> {
    while (true) {
      const jobId = await this.getRedisClient().rpoplpush(this.processingKey, this.queueKey)
      if (!jobId) return
    }
  }

  private async cleanupJob(jobId: string): Promise<void> {
    const payload = await this.getRedisClient().get(this.getJobKey(jobId))
    const parsedJob = parseAssistantRunQueuePayload(payload)

    await this.getRedisClient().lrem(this.processingKey, 1, jobId)
    await this.getRedisClient().del(this.getJobKey(jobId))
    if (parsedJob) {
      await this.getRedisClient().del(this.getRunKey(parsedJob.runId))
      await this.getRedisClient().del(this.getCancelledRunKey(parsedJob.runId))
    }
    await this.getRedisClient().srem(this.activeKey, jobId)
  }

  private async cleanupPendingCancelledJob(job: AssistantRunQueuePayload): Promise<void> {
    await this.getRedisClient().del(this.getJobKey(job.id))
    await this.getRedisClient().del(this.getRunKey(job.runId))
    await this.getRedisClient().del(this.getCancelledRunKey(job.runId))
    await this.getRedisClient().srem(this.activeKey, job.id)
  }

  private getJobKey(jobId: string): string {
    return `${this.jobKeyPrefix}:${jobId}`
  }

  private getRunKey(runId: string): string {
    return `${this.runKeyPrefix}:${runId}`
  }

  private getCancelledRunKey(runId: string): string {
    return `${this.cancelledRunKeyPrefix}:${runId}`
  }

  private getRedisClient(): AssistantRunQueueRedisClient {
    this.redisClient ??= redisService.getClient('assistantQueue')
    return this.redisClient
  }

  private getBlockingRedisClient(): AssistantRunQueueRedisClient {
    this.blockingRedisClient ??= redisService.getClient('assistantQueueBlocking')
    return this.blockingRedisClient
  }
}

function parseAssistantRunQueuePayload(payload: string | null): AssistantRunQueuePayload | null {
  if (!payload) return null

  try {
    const parsedJson: unknown = JSON.parse(payload)
    const parsedJob = assistantRunJobSchema.safeParse(parsedJson)

    if (!parsedJob.success) {
      console.error('Invalid assistant run job payload:', parsedJob.error)
      return null
    }

    return parsedJob.data
  } catch (error) {
    console.error('Failed to parse assistant run job payload:', error)
    return null
  }
}

function toAssistantMessageRunJob(job: AssistantRunQueuePayload): AssistantMessageRunJob {
  return {
    id: job.id,
    body: job.body,
    conversationId: job.conversationId,
    partId: job.partId,
    runId: job.runId,
    user: job.user,
    createdAt: job.createdAt,
  }
}

export const assistantRunQueue = new RedisAssistantRunQueue()
