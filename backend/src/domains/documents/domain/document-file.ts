export const DEFAULT_ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
] as const

export const DEFAULT_DOCUMENT_MAX_SIZE = 10 * 1024 * 1024

export interface DocumentFileValidationOptions {
  allowedTypes?: string[]
  maxSize?: number
}

export function validateDocumentFile(
  file: File,
  options: DocumentFileValidationOptions = {}
): void {
  const allowedTypes = options.allowedTypes || [...DEFAULT_ALLOWED_DOCUMENT_TYPES]
  const maxSize = options.maxSize || DEFAULT_DOCUMENT_MAX_SIZE

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Supported types: ${allowedTypes.join(', ')}`
    )
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    throw new Error(`File too large: ${file.name}. Maximum size: ${maxSizeMB}MB`)
  }

  if (file.size === 0) {
    throw new Error(`File ${file.name} is empty`)
  }
}

export function isDocumentFileValidationError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message.startsWith('Unsupported file type:') ||
    error.message.startsWith('File too large:') ||
    /^File .+ is empty$/.test(error.message)
  )
}

export function validateDocumentFiles(
  files: File[] | undefined,
  options: DocumentFileValidationOptions = {}
) {
  if (!files || files.length === 0) {
    return
  }

  for (const file of files) {
    validateDocumentFile(file, options)
  }
}

export function extractDocumentKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname.substring(1)
  } catch {
    return url
  }
}

export function requestDocumentsFolder(requestId: string): string {
  return `requests/${requestId}/documents`
}

export function documentFilenameFromUrl(url: string): string {
  return url.split('/').pop() || 'unknown'
}
