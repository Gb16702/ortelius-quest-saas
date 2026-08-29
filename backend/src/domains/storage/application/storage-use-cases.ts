import { randomUUID } from 'node:crypto'
import {
  buildTranscriptionPrompt,
  cappedMultipartPartCount,
  generateCallRecordingKey,
  validateMultipartUploadParts,
  validateStorageKey,
} from '../domain'
import type { StorageRepositoryPort, TranscriptionQueuePort } from './ports'
import type {
  AbortUploadRequest,
  CallRecordingUploadRequest,
  CompleteUploadRequest,
  PreSignedUploadUrls,
  SpeakerInfo,
  UploadCompleteResponse,
} from './storage-models'

export class GenerateUploadUrlsUseCase {
  constructor(private readonly storage: StorageRepositoryPort) {}

  async execute(request: CallRecordingUploadRequest): Promise<PreSignedUploadUrls> {
    const { callId, conversationId, maxParts = 50, userPrefix } = request

    const s3Key = generateCallRecordingKey(callId, conversationId, userPrefix)

    if (!validateStorageKey(s3Key)) {
      throw new Error('Invalid key format')
    }

    const result = await this.storage.generateMultipartUploadUrls(s3Key, {
      expiresIn: 3600,
      contentType: 'audio/webm',
      maxParts: cappedMultipartPartCount(maxParts),
    })

    return {
      ...result,
      callId,
      conversationId,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }
  }
}

export class CompleteUploadUseCase {
  constructor(
    private readonly storage: StorageRepositoryPort,
    private readonly transcriptionQueue: TranscriptionQueuePort
  ) {}

  async execute(
    request: CompleteUploadRequest,
    speakerInfo?: SpeakerInfo
  ): Promise<UploadCompleteResponse> {
    const { key, uploadId, parts, callId, conversationId } = request

    validateMultipartUploadParts(parts)

    const location = await this.storage.completeMultipartUpload(key, uploadId, parts)

    if (callId && conversationId && speakerInfo) {
      const transcriptId = randomUUID()

      await this.transcriptionQueue.addJob({
        id: transcriptId,
        audioKey: key,
        callId,
        conversationId,
        speakerInfo,
        options: {
          prompt: buildTranscriptionPrompt(speakerInfo.userName),
        },
      })

      return {
        success: true,
        location,
        transcriptId,
        message: 'Upload completed successfully. Transcription job created.',
      }
    }

    return {
      success: true,
      location,
      message: 'Upload completed successfully.',
    }
  }
}

export class AbortUploadUseCase {
  constructor(private readonly storage: StorageRepositoryPort) {}

  async execute(request: AbortUploadRequest): Promise<{ success: boolean; message: string }> {
    const { key, uploadId } = request

    await this.storage.abortMultipartUpload(key, uploadId)

    return {
      success: true,
      message: 'Upload aborted successfully',
    }
  }
}
