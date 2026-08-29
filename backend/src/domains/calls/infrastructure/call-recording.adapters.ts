import { eq } from 'drizzle-orm'
import { redisService } from '../../../infrastructure/cache/redis.service'
import { db } from '../../../infrastructure/database'
import { user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { buildIceServers } from '../../../infrastructure/networking/turn.utils'
import { s3Service } from '../../../infrastructure/storage/s3.service'
import { createCallRecordingUseCases } from '../application/call-recording.use-cases'
import { callEvents } from '../domain/call-events.service'
import { callLifecycleService } from './call-lifecycle.service'
import { callSessionService } from './call-session.store'
import { transcriptionService } from './calls.services'
import { voipCallRepository } from './voip-call.repository'

const recordingCompletionStore = {
  async markComplete(input: {
    callId: string
    conversationId: string
    userId: string
    userName: string
    totalChunks: number
  }): Promise<unknown[]> {
    const redis = redisService.getClient()
    const recordingKey = `recording:${input.callId}:${input.conversationId}`

    await redis.hset(
      recordingKey,
      input.userId,
      JSON.stringify({
        userId: input.userId,
        userName: input.userName,
        totalChunks: input.totalChunks,
        completedAt: new Date().toISOString(),
      })
    )

    await redis.expire(recordingKey, 3600)
    const allRecordings = await redis.hgetall(recordingKey)
    return Object.values(allRecordings).map((r) => JSON.parse(r))
  },

  async clear(callId: string, conversationId: string): Promise<void> {
    await redisService.getClient().del(`recording:${callId}:${conversationId}`)
  },
}

const userDirectory = {
  async getUserName(userId: string): Promise<string> {
    const userResult = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    return userResult[0]?.name || 'Unknown'
  },
}

const callRecordingRepository = {
  async updateRecordingUrl(callId: string, recordingUrl: string): Promise<void> {
    await voipCallRepository.update(callId, { recordingUrl })
  },
}

export const callRecordingUseCases = createCallRecordingUseCases({
  storage: s3Service,
  completions: recordingCompletionStore,
  users: userDirectory,
  sessions: callSessionService,
  transcription: transcriptionService,
  callAccess: callLifecycleService,
  recordings: callRecordingRepository,
  events: callEvents,
  iceServers: {
    build: buildIceServers,
  },
})
