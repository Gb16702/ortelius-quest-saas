import { describe, expect, it } from 'bun:test'
import { extractDocumentKeyFromUrl, requestDocumentsFolder, validateDocumentFile } from '../domain'

describe('Document domain', () => {
  it('validates supported non-empty files within the size limit', () => {
    const file = new File(['content'], 'request.pdf', { type: 'application/pdf' })

    expect(() => validateDocumentFile(file)).not.toThrow()
  })

  it('rejects unsupported file types', () => {
    const file = new File(['content'], 'script.exe', { type: 'application/x-executable' })

    expect(() => validateDocumentFile(file)).toThrow(/Unsupported file type/)
  })

  it('rejects empty files', () => {
    const file = new File([], 'empty.pdf', { type: 'application/pdf' })

    expect(() => validateDocumentFile(file)).toThrow('File empty.pdf is empty')
  })

  it('extracts S3 keys from URLs and leaves raw keys unchanged', () => {
    expect(extractDocumentKeyFromUrl('https://bucket.s3.amazonaws.com/documents/file.pdf')).toBe(
      'documents/file.pdf'
    )
    expect(extractDocumentKeyFromUrl('documents/file.pdf')).toBe('documents/file.pdf')
  })

  it('builds request document folders from the request id', () => {
    expect(requestDocumentsFolder('request-123')).toBe('requests/request-123/documents')
  })
})
