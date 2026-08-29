import type { LegalDocumentQuotaSnapshot } from '../domain'

export class LegalDocumentNotFoundError extends Error {
  constructor(message = 'Legal document not found') {
    super(message)
    this.name = 'LegalDocumentNotFoundError'
  }
}

export class LegalDocumentValidationError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 413 = 400
  ) {
    super(message)
    this.name = 'LegalDocumentValidationError'
  }
}

export class LegalDocumentQuotaExceededError extends LegalDocumentValidationError {
  constructor(readonly details: LegalDocumentQuotaSnapshot) {
    super(`Upload would exceed organization quota of ${details.quotaBytes} bytes`, 413)
    this.name = 'LegalDocumentQuotaExceededError'
  }
}
