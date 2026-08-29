import { describe, expect, it } from 'bun:test'
import {
  buildLegalDocumentStorageKey,
  calculateLegalDocumentQuota,
  LEGAL_DOC_MAX_FILE_BYTES,
  LEGAL_DOC_QUOTA_BYTES,
  legalDocumentUploadExceedsQuota,
  resolveLegalDocumentLabel,
  sanitizeLegalDocumentFilename,
  validateLegalDocumentFileShape,
} from '../domain'

describe('Legal document domain policy', () => {
  it('sanitizes filenames into a single pdf filename and fallback label', () => {
    expect(sanitizeLegalDocumentFilename('../Unsafe Contract.v1.pdf')).toEqual({
      ok: true,
      filename: '_Unsafe Contract_v1.pdf',
      baseLabel: '_Unsafe Contract_v1',
    })
  })

  it('rejects reserved or invalid filenames', () => {
    expect(sanitizeLegalDocumentFilename('CON.pdf')).toEqual({
      ok: false,
      reason: 'Filename is reserved',
    })
    expect(sanitizeLegalDocumentFilename('   ')).toEqual({
      ok: false,
      reason: 'Filename is invalid',
    })
  })

  it('validates PDF type and size limits', () => {
    expect(
      validateLegalDocumentFileShape({
        name: 'contract.txt',
        type: 'text/plain',
        size: 10,
      })
    ).toEqual({ ok: false, reason: 'File contract.txt: only application/pdf is accepted' })

    expect(
      validateLegalDocumentFileShape({
        name: 'contract.pdf',
        type: 'application/pdf',
        size: LEGAL_DOC_MAX_FILE_BYTES + 1,
      })
    ).toEqual({
      ok: false,
      reason: `File contract.pdf exceeds the ${LEGAL_DOC_MAX_FILE_BYTES} byte limit`,
    })

    expect(
      validateLegalDocumentFileShape({
        name: 'contract.pdf',
        type: 'application/pdf',
        size: 10,
      })
    ).toBeNull()
  })

  it('calculates quota snapshots and storage keys', () => {
    const snapshot = calculateLegalDocumentQuota(LEGAL_DOC_QUOTA_BYTES - 1, 2)

    expect(legalDocumentUploadExceedsQuota(snapshot)).toBe(true)
    expect(buildLegalDocumentStorageKey('org-1', 'doc-1')).toBe('legal-documents/org-1/doc-1.pdf')
    expect(resolveLegalDocumentLabel('  Custom label  ', 'Fallback')).toBe('Custom label')
    expect(resolveLegalDocumentLabel('   ', 'Fallback')).toBe('Fallback')
  })
})
