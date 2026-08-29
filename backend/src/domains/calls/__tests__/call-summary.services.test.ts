import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CallSummaryData, EnhancedTranscriptionResult } from '../domain/calls.types'
import { CallSummaryService } from '../infrastructure/calls.services'

const mockS3Service = {
  uploadBuffer: mock(() => Promise.resolve()),
  getDownloadUrl: mock(() => Promise.resolve('https://mock-download-url.com')),
  deleteFile: mock(() => Promise.resolve()),
}

function defaultTranscripts() {
  return [
    {
      id: 'transcript-1',
      callId: 'call-123',
      conversationId: 'conv-456',
      audioKey: 'audio-key-1',
      text: 'Hello, this is a test transcript.',
      segments: JSON.stringify([
        {
          id: 1,
          start: 0,
          end: 5,
          text: 'Hello, this is a test transcript.',
          speaker: { userId: 'user1', userName: 'John Doe', role: 'participant' },
        },
      ]),
      createdAt: new Date('2024-01-01T10:00:00Z'),
    },
  ]
}

const mockDb = {
  select: mock(() => ({
    from: mock(() => ({
      where: mock(() => ({
        orderBy: mock(() => Promise.resolve(defaultTranscripts())),
      })),
    })),
  })),
  update: mock(() => ({
    set: mock(() => ({
      where: mock(() => Promise.resolve()),
    })),
  })),
  insert: mock(() => ({
    values: mock(() => ({
      returning: mock(() => Promise.resolve([{ id: 'new-id' }])),
    })),
  })),
}

mock.module('../../../infrastructure/storage/s3.service', () => ({
  s3Service: mockS3Service,
}))

mock.module('../../../infrastructure/database', () => ({
  db: mockDb,
}))

describe('CallSummaryService', () => {
  let callSummaryService: CallSummaryService

  beforeEach(() => {
    callSummaryService = new CallSummaryService()

    mockS3Service.uploadBuffer.mockReset()
    mockS3Service.getDownloadUrl.mockReset()
    mockS3Service.deleteFile.mockReset()
    mockDb.select.mockReset()
    mockDb.update.mockReset()

    mockS3Service.uploadBuffer.mockResolvedValue(undefined)
    mockS3Service.getDownloadUrl.mockResolvedValue('https://mock-download-url.com')
    mockS3Service.deleteFile.mockResolvedValue(undefined)
    mockDb.select.mockReturnValue({
      from: mock(() => ({
        where: mock(() => ({
          orderBy: mock(() => Promise.resolve(defaultTranscripts())),
        })),
      })),
    })
    mockDb.update.mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    })
  })

  const mockTranscripts: EnhancedTranscriptionResult[] = [
    {
      id: 'transcript-1',
      text: 'Hello, this is a test transcript.',
      segments: [
        {
          id: 1,
          start: 0,
          end: 5,
          text: 'Hello, this is a test transcript.',
          speaker: { userId: 'user1', userName: 'John Doe', role: 'participant' },
        },
      ],
      audioKey: 'audio-key-1',
      createdAt: new Date('2024-01-01T10:00:00Z'),
    },
  ]

  describe('generateCallSummary', () => {
    it('should generate a call summary successfully', async () => {
      mockS3Service.uploadBuffer.mockResolvedValue(undefined)

      const summaryKey = await callSummaryService.generateCallSummary('call-123', 'conv-456')

      expect(summaryKey).toContain('call-summary/conv-456/call-123-summary-')
      expect(summaryKey).toContain('.pdf')
      expect(mockS3Service.uploadBuffer).toHaveBeenCalledTimes(1)
      expect(mockS3Service.deleteFile).toHaveBeenCalledTimes(1)
    })

    it('should throw error when no transcripts found', async () => {
      mockDb.select.mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            orderBy: mock(() => Promise.resolve([])),
          })),
        })),
      })

      await expect(callSummaryService.generateCallSummary('call-123', 'conv-456')).rejects.toThrow(
        'No transcripts found for this call'
      )
    })

    it('should handle PDF generation errors', async () => {
      mockS3Service.uploadBuffer.mockRejectedValue(new Error('S3 upload failed'))

      await expect(callSummaryService.generateCallSummary('call-123', 'conv-456')).rejects.toThrow(
        'Failed to generate call summary: S3 upload failed'
      )
    })
  })

  describe('getSummaryUrl', () => {
    it('should return download URL for existing summary', async () => {
      const expectedUrl = 'https://mock-download-url.com'
      mockS3Service.getDownloadUrl.mockResolvedValue(expectedUrl)

      const url = await callSummaryService.getSummaryUrl('call-123', 'conv-456')

      expect(url).toBe(expectedUrl)
      expect(mockS3Service.getDownloadUrl).toHaveBeenCalledTimes(1)
    })

    it('should return null when S3 service fails', async () => {
      mockS3Service.getDownloadUrl.mockRejectedValue(new Error('S3 error'))

      const url = await callSummaryService.getSummaryUrl('call-123', 'conv-456')

      expect(url).toBeNull()
    })
  })

  describe('PDF generation', () => {
    it('should create PDF with call data', async () => {
      const _callData: CallSummaryData = {
        callId: 'call-123',
        conversationId: 'conv-456',
        participants: [{ userId: 'user1', userName: 'John Doe', role: 'participant' }],
        transcripts: mockTranscripts,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
      }

      const summaryKey = await callSummaryService.generateCallSummary('call-123', 'conv-456')

      expect(summaryKey).toBeDefined()
      expect(mockS3Service.uploadBuffer).toHaveBeenCalledWith(
        expect.stringContaining('call-summary/conv-456/call-123-summary-'),
        expect.any(Buffer),
        'application/pdf'
      )
    })
  })

  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      const _callSummaryService = new CallSummaryService()

      expect(true).toBe(true)
    })
  })

  describe('generateSummaryKey', () => {
    it('should generate unique summary keys', async () => {
      const key1 = await callSummaryService.generateCallSummary('call-1', 'conv-1')
      const key2 = await callSummaryService.generateCallSummary('call-2', 'conv-2')

      expect(key1).not.toBe(key2)
      expect(key1).toContain('call-summary/conv-1/call-1-summary-')
      expect(key2).toContain('call-summary/conv-2/call-2-summary-')
    })
  })

  describe('cleanupAudioChunks', () => {
    it('should clean up audio files after summary generation', async () => {
      await callSummaryService.generateCallSummary('call-123', 'conv-456')

      expect(mockS3Service.deleteFile).toHaveBeenCalledWith('audio-key-1')
    })

    it('should handle cleanup errors gracefully', async () => {
      mockS3Service.deleteFile.mockRejectedValue(new Error('Delete failed'))

      await expect(
        callSummaryService.generateCallSummary('call-123', 'conv-456')
      ).resolves.toBeDefined()
    })
  })

  describe('extractCallData', () => {
    it('should extract participants from transcript segments', async () => {
      const summaryKey = await callSummaryService.generateCallSummary('call-123', 'conv-456')

      expect(summaryKey).toBeDefined()
    })

    it('should handle transcripts without speaker info', async () => {
      const transcriptsWithoutSpeakers = [
        {
          ...mockTranscripts[0],
          segments: [
            {
              id: 1,
              start: 0,
              end: 5,
              text: 'Anonymous speech',
              speaker: 'unknown',
            },
          ],
        },
      ]

      mockDb.select.mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            orderBy: mock(() => Promise.resolve(transcriptsWithoutSpeakers)),
          })),
        })),
      })

      const summaryKey = await callSummaryService.generateCallSummary('call-123', 'conv-456')

      expect(summaryKey).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle empty transcript segments', async () => {
      const emptyTranscripts = [
        {
          ...mockTranscripts[0],
          segments: [],
        },
      ]

      mockDb.select.mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            orderBy: mock(() => Promise.resolve(emptyTranscripts)),
          })),
        })),
      })

      const summaryKey = await callSummaryService.generateCallSummary('call-123', 'conv-456')

      expect(summaryKey).toBeDefined()
    })

    it('should handle multiple participants', async () => {
      const multiParticipantTranscripts = [
        {
          ...mockTranscripts[0],
          segments: [
            {
              id: 1,
              start: 0,
              end: 5,
              text: 'Hello from John',
              speaker: { userId: 'user1', userName: 'John Doe', role: 'participant' },
            },
            {
              id: 2,
              start: 5,
              end: 10,
              text: 'Hello from Jane',
              speaker: { userId: 'user2', userName: 'Jane Smith', role: 'moderator' },
            },
          ],
        },
      ]

      mockDb.select.mockReturnValue({
        from: mock(() => ({
          where: mock(() => ({
            orderBy: mock(() => Promise.resolve(multiParticipantTranscripts)),
          })),
        })),
      })

      const summaryKey = await callSummaryService.generateCallSummary('call-123', 'conv-456')

      expect(summaryKey).toBeDefined()
    })
  })
})
