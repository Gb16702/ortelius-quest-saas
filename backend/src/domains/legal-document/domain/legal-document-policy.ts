export const LEGAL_DOC_QUOTA_BYTES = 500 * 1024 * 1024
export const LEGAL_DOC_MAX_FILE_BYTES = 25 * 1024 * 1024
export const LEGAL_DOC_MAX_FILES_PER_REQUEST = 10
export const LEGAL_DOC_S3_FOLDER = 'legal-documents'
export const LEGAL_DOC_MIME_TYPE = 'application/pdf'

const WINDOWS_RESERVED_FILENAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])

export interface SanitizedLegalDocumentFilename {
  ok: true
  filename: string
  baseLabel: string
}

export interface LegalDocumentPolicyFailure {
  ok: false
  reason: string
}

export type LegalDocumentFilenameResult =
  | SanitizedLegalDocumentFilename
  | LegalDocumentPolicyFailure

export function sanitizeLegalDocumentFilename(input: string): LegalDocumentFilenameResult {
  if (!input || typeof input !== 'string') {
    return { ok: false, reason: 'Filename is required' }
  }

  const normalized = input.normalize('NFC')
  let name = ''
  for (const ch of normalized) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    if (cp <= 0x1f || cp === 0x7f) continue
    if (ch === '/' || ch === '\\') continue
    name += ch
  }
  name = name.trim()

  if (name === '' || name === '.' || name === '..' || name === '\u2026') {
    return { ok: false, reason: 'Filename is invalid' }
  }

  const lastDot = name.lastIndexOf('.')
  let stem = lastDot > 0 ? name.slice(0, lastDot) : name
  stem = stem.replace(/[^A-Za-z0-9 _.-]/g, '_')
  stem = stem.replace(/\.+/g, '_').trim()

  if (stem === '') {
    return { ok: false, reason: 'Filename is invalid' }
  }

  if (WINDOWS_RESERVED_FILENAMES.has(stem.toUpperCase())) {
    return { ok: false, reason: 'Filename is reserved' }
  }

  let filename = `${stem}.pdf`
  const encoder = new TextEncoder()
  while (encoder.encode(filename).length > 255) {
    stem = stem.slice(0, -1)
    if (stem === '') {
      return { ok: false, reason: 'Filename is invalid' }
    }
    filename = `${stem}.pdf`
  }

  return { ok: true, filename, baseLabel: stem }
}

export interface LegalDocumentFileShape {
  name: string
  type: string
  size: number
}

export interface LegalDocumentQuotaSnapshot {
  currentSizeBytes: number
  incomingSizeBytes: number
  quotaBytes: number
}

export function validateLegalDocumentFileShape(
  file: LegalDocumentFileShape
): LegalDocumentPolicyFailure | null {
  if (file.type !== LEGAL_DOC_MIME_TYPE) {
    return { ok: false, reason: `File ${file.name}: only application/pdf is accepted` }
  }

  if (file.size <= 0) {
    return { ok: false, reason: `File ${file.name} is empty` }
  }

  if (file.size > LEGAL_DOC_MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: `File ${file.name} exceeds the ${LEGAL_DOC_MAX_FILE_BYTES} byte limit`,
    }
  }

  return null
}

export function calculateLegalDocumentQuota(
  currentSizeBytes: number,
  incomingSizeBytes: number
): LegalDocumentQuotaSnapshot {
  return {
    currentSizeBytes,
    incomingSizeBytes,
    quotaBytes: LEGAL_DOC_QUOTA_BYTES,
  }
}

export function legalDocumentUploadExceedsQuota(snapshot: LegalDocumentQuotaSnapshot): boolean {
  return snapshot.currentSizeBytes + snapshot.incomingSizeBytes > snapshot.quotaBytes
}

export function buildLegalDocumentStorageKey(organizationId: string, documentId: string): string {
  return `${LEGAL_DOC_S3_FOLDER}/${organizationId}/${documentId}.pdf`
}

export function resolveLegalDocumentLabel(label: string | undefined, fallback: string): string {
  const trimmed = label?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}
