import { desc, eq } from 'drizzle-orm'
import jsPDF from 'jspdf'
import { redisService } from '../../../infrastructure/cache/redis.service'
import { env } from '../../../infrastructure/config/environment'
import { db } from '../../../infrastructure/database'
import { message } from '../../../infrastructure/database/db/schemas/chat-schema'
import { transcript } from '../../../infrastructure/database/db/schemas/transcript-schema'
import { logAiUsage } from '../../../infrastructure/monitoring/ai-usage.service'
import { decryptContent, encryptContent } from '../../../infrastructure/security/encryption.service'
import { s3Service } from '../../../infrastructure/storage/s3.service'
import { CallSessionService } from '../application/call-session.service'
import type {
  CallSummaryData,
  CallSummaryRepository,
  EnhancedTranscriptionResult,
  EnhancedTranscriptSegment,
  TranscriptionJob,
  TranscriptionOptions,
  TranscriptionQueueRepository,
  TranscriptionRepository,
  TranscriptionResult,
  TranscriptSegment,
} from '../domain/calls.types'

interface WhisperSegment {
  id: number
  start: number
  end: number
  text: string
}

interface WhisperAPIResponse {
  text: string
  segments: WhisperSegment[]
}

function parseTranscriptSegments(value: unknown): TranscriptSegment[] {
  if (Array.isArray(value)) return value as TranscriptSegment[]
  if (typeof value !== 'string' || value.length === 0) return []
  return JSON.parse(value) as TranscriptSegment[]
}

export { CallSessionService } from '../application/call-session.service'

export class TranscriptionService implements TranscriptionRepository {
  private readonly openaiApiKey: string
  private readonly openaiBaseUrl = 'https://api.openai.com/v1'

  constructor() {
    this.openaiApiKey = env.OPENAI_API_KEY
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required for transcription service')
    }
  }

  async mergeAndTranscribeCall(
    callId: string,
    conversationId: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      // Concatenating webm bytes across different encoders produces a corrupt file.
      // Transcribe each speaker's track separately so segment timestamps and speaker
      // attribution stay correct; CallSummaryService interleaves segments at PDF time.
      const tracks = await this.collectSpeakerTracks(callId, conversationId)
      if (tracks.length === 0) {
        throw new Error('No audio tracks found for this call')
      }

      const speakerInfos = await this.resolveSpeakerInfos(tracks.map((t) => t.userId))

      const results: TranscriptionResult[] = []
      let combinedText = ''
      const combinedSegments: TranscriptSegment[] = []
      let lastTranscriptId = ''

      for (const track of tracks) {
        const speakerInfo = speakerInfos.get(track.userId)
        const transcription = await this.callWhisperAPI(track.buffer, options)

        const segments: TranscriptSegment[] = (transcription.segments || []).map((segment) => ({
          ...segment,
          speaker: track.userId,
        }))

        // Always upload the per-speaker track so the artifact is replayable / reviewable.
        const speakerKey = `calls/${conversationId}/${callId}/${track.userId}/audio.webm`
        await s3Service.uploadBuffer(speakerKey, track.buffer, 'audio/webm')

        const transcriptRecord = await this.saveTranscript({
          callId,
          conversationId,
          audioKey: speakerKey,
          text: transcription.text,
          segments,
          speakerInfo: speakerInfo
            ? { userId: speakerInfo.userId, userName: speakerInfo.userName }
            : undefined,
        })

        results.push({
          id: transcriptRecord.id,
          text: transcription.text,
          segments,
        })

        combinedText += `${combinedText ? '\n' : ''}${speakerInfo?.userName || track.userId}: ${transcription.text}`
        for (const seg of segments) combinedSegments.push(seg)
        lastTranscriptId = transcriptRecord.id
      }

      // System message + push notif still get triggered for the call (uses any transcript id).
      await this.updateCallSummaryWithTranscript(callId, conversationId, lastTranscriptId)

      combinedSegments.sort((a, b) => (a.start || 0) - (b.start || 0))

      return {
        id: lastTranscriptId,
        text: combinedText,
        segments: combinedSegments,
      }
    } catch (error) {
      console.error('Transcription failed:', error)
      throw new Error(
        `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async collectSpeakerTracks(
    callId: string,
    conversationId: string
  ): Promise<Array<{ userId: string; buffer: Buffer }>> {
    const tracks: Array<{ userId: string; buffer: Buffer }> = []

    // 1) New flow — multipart presigned uploads land at recordings/{convId}/{callId}/{speakerId}/audio.webm
    const multipartPrefix = `recordings/${conversationId}/${callId}/`
    const multipartFiles = await s3Service.listFiles(multipartPrefix)
    for (const file of multipartFiles) {
      const match = file.key.match(/([^/]+)\/audio\.webm$/)
      if (!match) continue
      const userId = match[1]
      const buffer = await this.downloadFromS3(file.key)
      tracks.push({ userId, buffer })
    }

    // 2) Legacy flow — chunked /upload-chunk drops calls/{convId}/{callId}/{userId}/chunk_N.webm.
    // Concatenating chunks produced by THE SAME encoder for ONE speaker is valid; it's the
    // cross-speaker concat in the old mergeCallChunks that produced corrupt webm.
    if (tracks.length === 0) {
      const chunkPrefix = `calls/${conversationId}/${callId}/`
      const chunkFiles = await s3Service.listFiles(chunkPrefix)
      const perUserChunks = new Map<string, Array<{ key: string; index: number }>>()
      for (const file of chunkFiles) {
        const match = file.key.match(/([^/]+)\/chunk_(\d+)\.webm$/)
        if (!match) continue
        const userId = match[1]
        const index = Number.parseInt(match[2], 10)
        if (!perUserChunks.has(userId)) perUserChunks.set(userId, [])
        perUserChunks.get(userId)!.push({ key: file.key, index })
      }
      for (const [userId, chunks] of perUserChunks) {
        chunks.sort((a, b) => a.index - b.index)
        const buffers: Buffer[] = []
        for (const chunk of chunks) buffers.push(await this.downloadFromS3(chunk.key))
        tracks.push({ userId, buffer: Buffer.concat(buffers) })
      }
    }

    return tracks
  }

  private async resolveSpeakerInfos(
    userIds: string[]
  ): Promise<Map<string, { userId: string; userName: string }>> {
    const result = new Map<string, { userId: string; userName: string }>()
    if (userIds.length === 0) return result
    const { user } = await import('../../../infrastructure/database/db/schemas/auth-schema')
    const { inArray } = await import('drizzle-orm')
    const rows = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, userIds))
    for (const row of rows) {
      result.set(row.id, { userId: row.id, userName: row.name || row.id })
    }
    return result
  }

  private async downloadFromS3(key: string): Promise<Buffer> {
    const url = await s3Service.getDownloadUrl(key, 3600)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to download ${key}: ${response.statusText}`)
    return Buffer.from(await response.arrayBuffer())
  }

  private async updateCallSummaryWithTranscript(
    callId: string,
    conversationId: string,
    transcriptId: string
  ): Promise<void> {
    try {
      const messages = await db
        .select()
        .from(message)
        .where(eq(message.conversationId, conversationId))
        .orderBy(desc(message.createdAt))
        .limit(10)

      const callSummaryMessage = messages.find(
        (m) =>
          m.messageType === 'system' &&
          m.metadata &&
          typeof m.metadata === 'object' &&
          'callId' in m.metadata &&
          m.metadata.callId === callId
      )

      if (callSummaryMessage) {
        const currentContent = decryptContent(callSummaryMessage.content)
        const updatedContent = `${currentContent}\nTranscript: View transcript`

        const existingMetadata =
          callSummaryMessage.metadata && typeof callSummaryMessage.metadata === 'object'
            ? callSummaryMessage.metadata
            : {}

        await db
          .update(message)
          .set({
            content: encryptContent(updatedContent),
            metadata: {
              ...existingMetadata,
              transcriptId,
            },
            updatedAt: new Date(),
          })
          .where(eq(message.id, callSummaryMessage.id))

        await this.notifyTranscriptReady(conversationId, callId, transcriptId)
      }
    } catch (error) {
      console.error('Failed to update call summary with transcript:', error)
    }
  }

  private async notifyTranscriptReady(
    conversationId: string,
    callId: string,
    transcriptId: string
  ): Promise<void> {
    try {
      const { notificationApplicationService } = await import(
        '../../notifications/notifications.application'
      )
      const { conversationParticipant } = await import(
        '../../../infrastructure/database/db/schemas/chat-schema'
      )
      const { isNull, and, eq } = await import('drizzle-orm')

      const participants = await db
        .select({ userId: conversationParticipant.userId })
        .from(conversationParticipant)
        .where(
          and(
            eq(conversationParticipant.conversationId, conversationId),
            isNull(conversationParticipant.leftAt)
          )
        )

      for (const participant of participants) {
        await notificationApplicationService.create(participant.userId, {
          type: 'conversation_update',
          title: 'Call transcript ready',
          message: 'The transcript for your recent call is now available',
          data: {
            conversationId,
            callId,
            transcriptId,
          },
          timestamp: new Date().toISOString(),
          userId: participant.userId,
        })
      }
    } catch (error) {
      console.error('Failed to notify participants about transcript:', error)
    }
  }

  private async mergeCallChunks(callId: string, conversationId: string): Promise<Buffer> {
    try {
      const prefix = `calls/${conversationId}/${callId}/`
      const allFiles = await s3Service.listFiles(prefix)

      const userChunks = new Map<string, Array<{ key: string; index: number }>>()

      for (const file of allFiles) {
        const match = file.key.match(/([^/]+)\/chunk_(\d+)\.webm$/)
        if (match) {
          const userId = match[1]
          const index = Number.parseInt(match[2], 10)

          if (!userChunks.has(userId)) {
            userChunks.set(userId, [])
          }
          userChunks.get(userId)!.push({ key: file.key, index })
        }
      }

      const mergedBuffers: Buffer[] = []

      for (const [_userId, chunks] of userChunks) {
        chunks.sort((a, b) => a.index - b.index)

        for (const chunk of chunks) {
          const downloadUrl = await s3Service.getDownloadUrl(chunk.key, 3600)
          const response = await fetch(downloadUrl)

          if (!response.ok) {
            throw new Error(`Failed to download chunk: ${chunk.key}`)
          }

          const arrayBuffer = await response.arrayBuffer()
          mergedBuffers.push(Buffer.from(arrayBuffer))
        }
      }

      return Buffer.concat(mergedBuffers)
    } catch (error) {
      throw new Error(
        `Failed to merge chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async transcribeAudioFile(
    audioKey: string,
    callId: string,
    conversationId: string,
    options: TranscriptionOptions = {},
    speakerInfo?: {
      userId: string
      userName: string
    }
  ): Promise<TranscriptionResult> {
    const startedAt = Date.now()
    const model = options.model || 'whisper-1'
    try {
      const audioBuffer = await this.getAudioFromS3(audioKey)
      const transcriptionData = await this.callWhisperAPI(audioBuffer, options)
      void logAiUsage({
        feature: 'call_transcription',
        model,
        durationMs: Date.now() - startedAt,
        success: true,
        metadata: { callId, conversationId, audioBytes: audioBuffer.byteLength },
      })

      const segments: TranscriptSegment[] =
        transcriptionData.segments?.map((segment) => ({
          ...segment,
          speaker: speakerInfo?.userId,
        })) || []

      const transcriptRecord = await this.saveTranscript({
        callId,
        conversationId,
        audioKey,
        text: transcriptionData.text,
        segments,
        speakerInfo: speakerInfo,
      })

      return {
        id: transcriptRecord.id,
        text: transcriptionData.text,
        segments,
      }
    } catch (error) {
      void logAiUsage({
        feature: 'call_transcription',
        model,
        durationMs: Date.now() - startedAt,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: { callId, conversationId },
      })
      console.error('Transcription failed:', error)
      throw new Error(
        `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async getAudioFromS3(audioKey: string): Promise<Buffer> {
    try {
      const downloadUrl = await s3Service.getDownloadUrl(audioKey, 3600)
      const response = await fetch(downloadUrl)

      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      throw new Error(
        `Failed to get audio from S3: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async callWhisperAPI(
    audioBuffer: Buffer,
    options: TranscriptionOptions = {}
  ): Promise<WhisperAPIResponse> {
    const formData = new FormData()

    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' })
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', options.model || 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'segment')

    if (options.prompt) {
      formData.append('prompt', options.prompt)
    }

    if (options.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString())
    }

    const response = await fetch(`${this.openaiBaseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Whisper API error: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  private async saveTranscript(data: {
    callId: string
    conversationId: string
    audioKey: string
    text: string
    segments: TranscriptSegment[]
    speakerInfo?: {
      userId: string
      userName: string
    }
  }) {
    const [transcriptRecord] = await db
      .insert(transcript)
      .values({
        callId: data.callId,
        conversationId: data.conversationId,
        audioKey: data.audioKey,
        text: data.text,
        segments: JSON.stringify(data.segments),
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return transcriptRecord
  }

  async getTranscript(transcriptId: string) {
    const [transcriptRecord] = await db
      .select()
      .from(transcript)
      .where(eq(transcript.id, transcriptId))
      .limit(1)

    if (!transcriptRecord) {
      throw new Error('Transcript not found')
    }

    return {
      ...transcriptRecord,
      segments: JSON.parse(transcriptRecord.segments || '[]') as TranscriptSegment[],
    }
  }

  async getTranscriptsByConversation(conversationId: string) {
    const transcripts = await db
      .select()
      .from(transcript)
      .where(eq(transcript.conversationId, conversationId))
      .orderBy(transcript.createdAt)

    return transcripts.map((t) => ({
      ...t,
      segments: parseTranscriptSegments(t.segments),
    }))
  }

  async getTranscriptByCall(callId: string) {
    const [transcriptRecord] = await db
      .select()
      .from(transcript)
      .where(eq(transcript.callId, callId))
      .limit(1)

    if (!transcriptRecord) {
      return null
    }

    return {
      ...transcriptRecord,
      segments: JSON.parse(transcriptRecord.segments || '[]') as TranscriptSegment[],
    }
  }

  async deleteTranscript(transcriptId: string) {
    const [transcriptRecord] = await db
      .select()
      .from(transcript)
      .where(eq(transcript.id, transcriptId))
      .limit(1)

    if (!transcriptRecord) {
      throw new Error('Transcript not found')
    }

    if (transcriptRecord.audioKey) {
      try {
        await s3Service.deleteFile(transcriptRecord.audioKey)
      } catch (error) {
        console.error('Failed to delete audio file from S3:', error)
      }
    }

    await db.delete(transcript).where(eq(transcript.id, transcriptId))
  }
}

export class TranscriptionQueueService implements TranscriptionQueueRepository {
  private readonly queueKey = 'transcription:jobs'
  private readonly processingKey = 'transcription:processing'
  private isProcessing = false
  private redisClient = redisService.getClient()
  private transcriptionService: TranscriptionService
  private callSummaryService: CallSummaryService

  constructor(transcriptionService: TranscriptionService, callSummaryService: CallSummaryService) {
    this.transcriptionService = transcriptionService
    this.callSummaryService = callSummaryService
  }

  async addJob(job: TranscriptionJob): Promise<void> {
    try {
      await db.insert(transcript).values({
        id: job.id,
        callId: job.callId,
        conversationId: job.conversationId,
        audioKey: job.audioKey,
        text: '',
        segments: '[]',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await this.redisClient.lpush(this.queueKey, JSON.stringify(job))

      if (!this.isProcessing) {
        this.processJobs()
      }
    } catch (error) {
      console.error('Failed to add transcription job:', error)
      throw error
    }
  }

  private async processJobs(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true

    try {
      while (true) {
        const jobData = await this.redisClient.brpop(this.queueKey, 10)

        if (!jobData) {
          break
        }

        const job: TranscriptionJob = JSON.parse(jobData[1])
        await this.processJob(job)
      }
    } catch (error) {
      console.error('Error in transcription job processor:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processJob(job: TranscriptionJob): Promise<void> {
    try {
      await this.updateJobStatus(job.id, 'processing')
      await this.redisClient.sadd(this.processingKey, job.id)

      await this.transcriptionService.transcribeAudioFile(
        job.audioKey,
        job.callId,
        job.conversationId,
        job.options,
        job.speakerInfo
      )

      await this.updateJobStatus(job.id, 'completed')
      await this.checkAndGenerateCallSummary(job.callId, job.conversationId)
    } catch (error) {
      console.error(`Transcription job failed: ${job.id}`, error)
      await this.updateJobStatus(job.id, 'failed')
    } finally {
      await this.redisClient.srem(this.processingKey, job.id)
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    await db
      .update(transcript)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(transcript.id, jobId))
  }

  async getJobStatus(jobId: string) {
    const [job] = await db
      .select({
        status: transcript.status,
        id: transcript.id,
        text: transcript.text,
        segments: transcript.segments,
      })
      .from(transcript)
      .where(eq(transcript.id, jobId))
      .limit(1)

    if (!job) {
      return { status: 'not_found' }
    }

    const result: { status: string; result?: TranscriptionResult } = {
      status: job.status || 'pending',
    }

    if (job.text && job.segments) {
      result.result = {
        id: job.id,
        text: job.text,
        segments: typeof job.segments === 'string' ? JSON.parse(job.segments) : job.segments,
      }
    }

    return result
  }

  async getQueueStats() {
    const queueLength = await this.redisClient.llen(this.queueKey)
    const processingCount = await this.redisClient.scard(this.processingKey)

    return {
      queueLength,
      processingCount,
      isProcessing: this.isProcessing,
    }
  }

  async retryFailedJob(jobId: string): Promise<void> {
    const [transcriptRecord] = await db
      .select()
      .from(transcript)
      .where(eq(transcript.id, jobId))
      .limit(1)

    if (!transcriptRecord) {
      throw new Error('Transcript not found')
    }

    if (transcriptRecord.status !== 'failed') {
      throw new Error('Only failed jobs can be retried')
    }

    const job: TranscriptionJob = {
      id: transcriptRecord.id,
      audioKey: transcriptRecord.audioKey,
      callId: transcriptRecord.callId,
      conversationId: transcriptRecord.conversationId,
    }

    await this.updateJobStatus(jobId, 'pending')
    await this.redisClient.lpush(this.queueKey, JSON.stringify(job))

    if (!this.isProcessing) {
      this.processJobs()
    }
  }

  startProcessor(): void {
    if (!this.isProcessing) {
      this.processJobs()
    }
  }

  async stopProcessor(): Promise<void> {
    this.isProcessing = false
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  private async checkAndGenerateCallSummary(callId: string, conversationId: string): Promise<void> {
    try {
      const callTranscripts = await db
        .select()
        .from(transcript)
        .where(eq(transcript.callId, callId))

      const hasIncompleteJobs = callTranscripts.some(
        (t) => t.status === 'pending' || t.status === 'processing'
      )

      if (hasIncompleteJobs) {
        return
      }

      const completedTranscripts = callTranscripts.filter((t) => t.status === 'completed')

      if (completedTranscripts.length === 0) {
        return
      }

      await this.callSummaryService.generateCallSummary(callId, conversationId)
    } catch (error) {
      console.error(`Failed to generate call summary for call ${callId}:`, error)
    }
  }
}

export class CallSummaryService implements CallSummaryRepository {
  async generateCallSummary(callId: string, conversationId: string): Promise<string> {
    try {
      const transcripts = await this.getCallTranscripts(callId, conversationId)

      if (transcripts.length === 0) {
        throw new Error('No transcripts found for this call')
      }

      const callData = await this.extractCallData(callId, conversationId, transcripts)
      const pdfBuffer = await this.createPDF(callData)
      const s3Key = this.generateSummaryKey(callId, conversationId)
      await s3Service.uploadBuffer(s3Key, pdfBuffer, 'application/pdf')

      await db
        .update(transcript)
        .set({
          summaryKey: s3Key,
          updatedAt: new Date(),
        })
        .where(eq(transcript.callId, callId))

      await this.cleanupAudioChunks(transcripts)

      return s3Key
    } catch (error) {
      console.error('Failed to generate call summary:', error)
      throw new Error(
        `Failed to generate call summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async getCallTranscripts(callId: string, _conversationId: string) {
    const transcripts = await db
      .select()
      .from(transcript)
      .where(eq(transcript.callId, callId))
      .orderBy(transcript.createdAt)

    return transcripts.map((t) => ({
      ...t,
      segments: parseTranscriptSegments(t.segments),
    }))
  }

  private async extractCallData(
    callId: string,
    conversationId: string,
    transcripts: EnhancedTranscriptionResult[]
  ): Promise<CallSummaryData> {
    const participantMap = new Map()

    transcripts.forEach((transcript) => {
      if (transcript.segments) {
        transcript.segments.forEach((segment) => {
          if (segment.speaker && typeof segment.speaker === 'object') {
            participantMap.set(segment.speaker.userId, {
              userId: segment.speaker.userId,
              userName: segment.speaker.userName,
              role: segment.speaker.role,
            })
          }
        })
      }
    })

    const participants = Array.from(participantMap.values())
    const startTime = transcripts.length > 0 ? new Date(transcripts[0].createdAt) : new Date()
    const endTime =
      transcripts.length > 0 ? new Date(transcripts[transcripts.length - 1].createdAt) : new Date()

    return {
      callId,
      conversationId,
      participants,
      transcripts,
      startTime,
      endTime,
    }
  }

  private async createPDF(data: CallSummaryData): Promise<Buffer> {
    const doc = new jsPDF()

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('Call Summary Report', 20, 30)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)

    doc.text('Call Information:', 20, 50)
    doc.text(`Start Time: ${data.startTime.toLocaleString()}`, 30, 60)
    doc.text(`End Time: ${data.endTime.toLocaleString()}`, 30, 70)

    let yPos = 90
    doc.text('Participants:', 20, yPos)
    yPos += 10

    data.participants.forEach((participant, index) => {
      doc.text(`${index + 1}. ${participant.userName} (${participant.role})`, 30, yPos)
      yPos += 10
    })

    yPos += 10
    doc.text('Transcript:', 20, yPos)
    yPos += 15

    const allSegments: Array<
      EnhancedTranscriptSegment & {
        speakerInfo?: { userId: string; userName: string; role: string }
      }
    > = []

    data.transcripts.forEach((transcript) => {
      if (transcript.segments) {
        transcript.segments.forEach((segment) => {
          allSegments.push({
            ...segment,
            speakerInfo: typeof segment.speaker === 'object' ? segment.speaker : undefined,
          })
        })
      }
    })

    allSegments.sort((a, b) => (a.start || 0) - (b.start || 0))

    const uniqueSegments = allSegments.filter((segment, index, arr) => {
      if (index === 0) return true
      const prev = arr[index - 1]
      return !(
        segment.start === prev.start &&
        segment.text === prev.text &&
        segment.speakerInfo?.userName === prev.speakerInfo?.userName
      )
    })

    uniqueSegments.forEach((segment) => {
      const speaker = segment.speakerInfo ? segment.speakerInfo.userName : 'Unknown'
      const timestamp = segment.start ? this.formatTime(segment.start) : '00:00'
      const text = `[${timestamp}] ${speaker}: ${segment.text}`
      const splitText = doc.splitTextToSize(text, 170)

      if (yPos + splitText.length * 5 > 280) {
        doc.addPage()
        yPos = 20
      }

      doc.text(splitText, 20, yPos)
      yPos += splitText.length * 5 + 5
    })

    const pdfArrayBuffer = doc.output('arraybuffer')
    return Buffer.from(pdfArrayBuffer)
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  private generateSummaryKey(callId: string, conversationId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `call-summary/${conversationId}/${callId}-summary-${timestamp}.pdf`
  }

  private async cleanupAudioChunks(transcripts: EnhancedTranscriptionResult[]): Promise<void> {
    const deletePromises = transcripts.map(async (transcript) => {
      if (transcript.audioKey) {
        try {
          await s3Service.deleteFile(transcript.audioKey)
        } catch (error) {
          console.error(`Failed to delete audio chunk ${transcript.audioKey}:`, error)
        }
      }
    })

    await Promise.allSettled(deletePromises)
  }

  async getSummaryPDF(callId: string): Promise<{ buffer: Buffer; filename: string } | null> {
    try {
      const [transcriptRecord] = await db
        .select()
        .from(transcript)
        .where(eq(transcript.callId, callId))
        .limit(1)

      if (!transcriptRecord || !transcriptRecord.summaryKey) {
        return null
      }

      const buffer = await s3Service.getFile(transcriptRecord.summaryKey)
      const filename = `call-summary-${callId}.pdf`

      return { buffer, filename }
    } catch (error) {
      console.error('Failed to get summary PDF:', error)
      return null
    }
  }

  async getSummaryUrl(callId: string, conversationId: string): Promise<string | null> {
    try {
      return await s3Service.getDownloadUrl(this.generateSummaryKey(callId, conversationId), 3600)
    } catch (error) {
      console.error('Failed to get summary URL:', error)
      return null
    }
  }
}

export const callSessionService = CallSessionService.getInstance()
export const transcriptionService = new TranscriptionService()
export const callSummaryService = new CallSummaryService()
export const transcriptionQueue = new TranscriptionQueueService(
  transcriptionService,
  callSummaryService
)
