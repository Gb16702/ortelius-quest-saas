import { v4 as uuidv4 } from 'uuid'
import type { LegalDocumentClockPort, LegalDocumentIdPort } from '../application/ports'

export class UuidLegalDocumentIdAdapter implements LegalDocumentIdPort {
  newId(): string {
    return uuidv4()
  }
}

export class SystemLegalDocumentClock implements LegalDocumentClockPort {
  now(): Date {
    return new Date()
  }
}
