import { beforeEach, describe, expect, it } from 'bun:test'
import { extractDocumentKeyFromUrl } from '../domain'
import { S3DocumentRepository } from '../infrastructure/document.repository'

describe('DocumentsService', () => {
  let service: S3DocumentRepository

  beforeEach(() => {
    service = new S3DocumentRepository()
  })

  describe('validateFile', () => {
    it('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      })

      expect(() => {
        ;(
          service as unknown as {
            validateFile: (file: File, options: Record<string, unknown>) => void
          }
        ).validateFile(largeFile, {})
      }).toThrow('File too large: large.pdf. Maximum size: 10MB')
    })

    it('should reject unsupported file types', () => {
      const unsupportedFile = new File(['content'], 'file.exe', {
        type: 'application/x-executable',
      })

      expect(() => {
        ;(
          service as unknown as {
            validateFile: (file: File, options: Record<string, unknown>) => void
          }
        ).validateFile(unsupportedFile, {})
      }).toThrow(/Unsupported file type/)
    })

    it('should reject empty files', () => {
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' })

      expect(() => {
        ;(
          service as unknown as {
            validateFile: (file: File, options: Record<string, unknown>) => void
          }
        ).validateFile(emptyFile, {})
      }).toThrow('File empty.pdf is empty')
    })

    it('should accept valid files', () => {
      const validFile = new File(['content'], 'valid.pdf', { type: 'application/pdf' })

      expect(() => {
        ;(
          service as unknown as {
            validateFile: (file: File, options: Record<string, unknown>) => void
          }
        ).validateFile(validFile, {})
      }).not.toThrow()
    })

    it('should respect custom options', () => {
      const file = new File(['content'], 'file.txt', { type: 'text/plain' })
      const options = {
        allowedTypes: ['text/plain', 'text/plain;charset=utf-8'],
        maxSize: 1024,
      }

      expect(() => {
        ;(
          service as unknown as {
            validateFile: (file: File, options: Record<string, unknown>) => void
          }
        ).validateFile(file, options)
      }).not.toThrow()
    })
  })

  describe('extractKeyFromUrl', () => {
    it('should extract key from S3 URL', () => {
      const url = 'https://bucket.s3.amazonaws.com/documents/file.pdf'
      const key = extractDocumentKeyFromUrl(url)

      expect(key).toBe('documents/file.pdf')
    })

    it('should return original string for invalid URLs', () => {
      const invalidUrl = 'not-a-url'
      const key = extractDocumentKeyFromUrl(invalidUrl)

      expect(key).toBe('not-a-url')
    })
  })
})
