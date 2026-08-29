import type { CallParticipant, CallRecord } from '../domain/calls.types'
import type { CallEventPublisher } from './call-lifecycle.use-cases'

export interface ObjectStoragePort {
  uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<unknown>
  createMultipartUpload(
    key: string,
    contentType: string
  ): Promise<{ uploadId: string; key: string }>
  getPresignedPartUrls(uploadId: string, key: string, estimatedParts: number): Promise<unknown[]>
  completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: Array<{ partNumber: number; etag: string }>
  ): Promise<string>
  abortMultipartUpload(uploadId: string, key: string): Promise<void>
  getDownloadUrl(key: string, expiresIn: number): Promise<string>
}

export interface RecordingCompletionStore {
  markComplete(input: {
    callId: string
    conversationId: string
    userId: string
    userName: string
    totalChunks: number
  }): Promise<unknown[]>
  clear(callId: string, conversationId: string): Promise<void>
}

export interface UserDirectoryPort {
  getUserName(userId: string): Promise<string>
}

export interface CallSessionReader {
  getAllParticipants(callId: string): CallParticipant[]
}

export interface CallTranscriptionPort {
  mergeAndTranscribeCall(
    callId: string,
    conversationId: string,
    options?: Record<string, unknown>
  ): Promise<unknown>
  getTranscriptByCall(callId: string): Promise<{ summaryKey?: string | null } | null>
}

export interface CallAccessPort {
  getById(callId: string, userId: string): Promise<CallRecord>
}

export interface CallRecordingRepository {
  updateRecordingUrl(callId: string, recordingUrl: string): Promise<void>
}

export interface IceServerProvider {
  build(userId: string): unknown
}

export function createCallRecordingUseCases(deps: {
  storage: ObjectStoragePort
  completions: RecordingCompletionStore
  users: UserDirectoryPort
  sessions: CallSessionReader
  transcription: CallTranscriptionPort
  callAccess: CallAccessPort
  recordings: CallRecordingRepository
  events: CallEventPublisher
  iceServers: IceServerProvider
}) {
  return {
    async uploadChunk(input: {
      callId: string
      conversationId: string
      userId: string
      chunkIndex: string
      buffer: Buffer
    }): Promise<{ chunkKey: string }> {
      const chunkKey = `calls/${input.conversationId}/${input.callId}/${input.userId}/chunk_${input.chunkIndex}.webm`
      await deps.storage.uploadBuffer(chunkKey, input.buffer, 'audio/webm')
      return { chunkKey }
    },

    async completeLegacyRecording(input: {
      callId: string
      conversationId: string
      userId: string
      totalChunks: number
    }): Promise<void> {
      const userName = await deps.users.getUserName(input.userId)
      const recordings = await deps.completions.markComplete({
        ...input,
        userName,
      })

      const participants = deps.sessions.getAllParticipants(input.callId)
      if (recordings.length >= participants.length || participants.length === 0) {
        try {
          await deps.transcription.mergeAndTranscribeCall(input.callId, input.conversationId, {})
        } finally {
          await deps.completions.clear(input.callId, input.conversationId)
        }
      }
    },

    getIceServers(userId: string): unknown {
      return deps.iceServers.build(userId)
    },

    async initiateMultipart(input: {
      callId: string
      userId: string
      speakerId: string
      contentType: string
      estimatedParts: number
    }): Promise<{ uploadId: string; key: string; parts: unknown[] }> {
      const call = await deps.callAccess.getById(input.callId, input.userId)
      const key = `recordings/${call.conversationId}/${input.callId}/${input.speakerId}/audio.webm`
      const init = await deps.storage.createMultipartUpload(key, input.contentType)
      const parts = await deps.storage.getPresignedPartUrls(
        init.uploadId,
        init.key,
        input.estimatedParts
      )
      return { uploadId: init.uploadId, key: init.key, parts }
    },

    async completeMultipart(input: {
      callId: string
      userId: string
      uploadId: string
      key: string
      parts: Array<{ partNumber: number; etag: string }>
    }): Promise<{ recordingUrl: string }> {
      const call = await deps.callAccess.getById(input.callId, input.userId)
      const recordingUrl = await deps.storage.completeMultipartUpload(
        input.uploadId,
        input.key,
        input.parts
      )
      await deps.recordings.updateRecordingUrl(input.callId, recordingUrl)
      deps.events.publish({
        type: 'call.recording_completed',
        callId: input.callId,
        recordingUrl,
        conversationId: call.conversationId,
      })
      return { recordingUrl }
    },

    async abortMultipart(input: {
      callId: string
      userId: string
      uploadId: string
      key: string
    }): Promise<void> {
      await deps.callAccess.getById(input.callId, input.userId)
      await deps.storage.abortMultipartUpload(input.uploadId, input.key)
    },

    async getTranscriptDownload(input: {
      callId: string
      userId: string
    }): Promise<{ downloadUrl: string } | null> {
      await deps.callAccess.getById(input.callId, input.userId)
      const transcript = await deps.transcription.getTranscriptByCall(input.callId)
      if (!transcript?.summaryKey) return null
      const downloadUrl = await deps.storage.getDownloadUrl(transcript.summaryKey, 15 * 60)
      return { downloadUrl }
    },
  }
}
