import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { StorageRepositoryPort } from '../application/ports'
import type {
  CallRecordingUploadRequest,
  CompleteUploadRequest,
} from '../application/storage-models'
import {
  AbortUploadUseCase,
  CompleteUploadUseCase,
  GenerateUploadUrlsUseCase,
} from '../application/storage-use-cases'
import { generateCallRecordingKey, validateStorageKey } from '../domain'

describe('Storage domain', () => {
  describe('generateCallRecordingKey', () => {
    it('should generate key without user prefix', () => {
      const key = generateCallRecordingKey('call-123', 'conv-456')

      expect(key).toMatch(
        /^call-recordings\/conv-456\/call-123-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.webm$/
      )
    })

    it('should generate key with user prefix', () => {
      const key = generateCallRecordingKey('call-123', 'conv-456', 'user1')

      expect(key).toMatch(
        /^call-recordings\/conv-456\/call-123-user1-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.webm$/
      )
    })
  })

  describe('validateKey', () => {
    it('should validate correct keys', () => {
      expect(validateStorageKey('valid-key_123.webm')).toBe(true)
      expect(validateStorageKey('folder/subfolder/file.ext')).toBe(true)
    })

    it('should reject invalid keys', () => {
      expect(validateStorageKey('invalid key with spaces')).toBe(false)
      expect(validateStorageKey('key@with#special$chars')).toBe(false)
      expect(validateStorageKey('a'.repeat(1025))).toBe(false)
    })
  })

  describe.skip('AWS S3 Integration Tests', () => {
    it('should generate pre-signed URLs successfully', () => {})
    it('should complete multipart upload successfully', () => {})
    it('should abort multipart upload successfully', () => {})
  })
})

describe('Storage use cases', () => {
  let mockStorageService: StorageRepositoryPort
  const transcriptionQueue = {
    addJob: mock(() => Promise.resolve()),
  }

  beforeEach(() => {
    mockStorageService = {
      generateMultipartUploadUrls: mock(() =>
        Promise.resolve({
          uploadId: 'upload-id',
          key: 'test-key',
          urls: ['url1', 'url2'],
          completeUrl: 'complete-url',
          abortUrl: 'abort-url',
        })
      ),
      completeMultipartUpload: mock(() => Promise.resolve('location')),
      abortMultipartUpload: mock(() => Promise.resolve()),
    }

    transcriptionQueue.addJob.mockReset()
  })

  describe('generateUploadUrls', () => {
    it('should generate upload URLs successfully', async () => {
      const request: CallRecordingUploadRequest = {
        callId: 'call-123',
        conversationId: 'conv-456',
        maxParts: 10,
      }

      const result = await new GenerateUploadUrlsUseCase(mockStorageService).execute(request)

      expect(result.callId).toBe('call-123')
      expect(result.conversationId).toBe('conv-456')
      expect(result.expiresAt).toBeDefined()
      expect(mockStorageService.generateMultipartUploadUrls).toHaveBeenCalledWith(
        expect.stringMatching(/^call-recordings\/conv-456\/call-123-/),
        {
          expiresIn: 3600,
          contentType: 'audio/webm',
          maxParts: 10,
        }
      )
    })

    it('should generate upload URLs with user prefix', async () => {
      const request: CallRecordingUploadRequest = {
        callId: 'call-123',
        conversationId: 'conv-456',
        userPrefix: 'user1',
      }

      await new GenerateUploadUrlsUseCase(mockStorageService).execute(request)

      expect(mockStorageService.generateMultipartUploadUrls).toHaveBeenCalledWith(
        expect.stringMatching(/^call-recordings\/conv-456\/call-123-user1-/),
        expect.objectContaining({ maxParts: 50 })
      )
    })

    it('should throw error for invalid key', async () => {
      const request: CallRecordingUploadRequest = {
        callId: 'call with spaces',
        conversationId: 'conv-456',
      }

      await expect(
        new GenerateUploadUrlsUseCase(mockStorageService).execute(request)
      ).rejects.toThrow('Invalid key format')
    })
  })

  describe('completeUpload', () => {
    it('should complete upload with transcription job', async () => {
      const request: CompleteUploadRequest = {
        key: 'test-key',
        uploadId: 'upload-id',
        parts: [{ ETag: 'etag1', PartNumber: 1 }],
        callId: 'call-123',
        conversationId: 'conv-456',
      }

      const speakerInfo = { userId: 'user1', userName: 'John Doe' }

      const result = await new CompleteUploadUseCase(
        mockStorageService,
        transcriptionQueue
      ).execute(request, speakerInfo)

      expect(result.success).toBe(true)
      expect(result.location).toBe('location')
      expect(result.transcriptId).toBeDefined()
      expect(transcriptionQueue.addJob).toHaveBeenCalledTimes(1)
    })

    it('should complete upload without transcription job', async () => {
      const request: CompleteUploadRequest = {
        key: 'test-key',
        uploadId: 'upload-id',
        parts: [{ ETag: 'etag1', PartNumber: 1 }],
      }

      const result = await new CompleteUploadUseCase(
        mockStorageService,
        transcriptionQueue
      ).execute(request)

      expect(result.success).toBe(true)
      expect(result.location).toBe('location')
      expect(result.transcriptId).toBeUndefined()
      expect(transcriptionQueue.addJob).not.toHaveBeenCalled()
    })

    it('should throw error for invalid parts', async () => {
      const request: CompleteUploadRequest = {
        key: 'test-key',
        uploadId: 'upload-id',
        parts: [{ ETag: '', PartNumber: 1 }],
      }

      await expect(
        new CompleteUploadUseCase(mockStorageService, transcriptionQueue).execute(request)
      ).rejects.toThrow('Invalid parts format')
    })
  })

  describe('abortUpload', () => {
    it('should abort upload successfully', async () => {
      const request = {
        key: 'test-key',
        uploadId: 'upload-id',
      }

      const result = await new AbortUploadUseCase(mockStorageService).execute(request)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Upload aborted successfully')
      expect(mockStorageService.abortMultipartUpload).toHaveBeenCalledWith('test-key', 'upload-id')
    })
  })
})
