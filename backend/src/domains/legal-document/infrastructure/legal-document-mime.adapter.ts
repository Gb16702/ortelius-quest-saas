import { fileTypeFromBuffer } from 'file-type'
import type { LegalDocumentMimeDetectorPort } from '../application/ports'

export class FileTypeLegalDocumentMimeDetector implements LegalDocumentMimeDetectorPort {
  async detectMime(data: Uint8Array): Promise<{ mime: string } | null> {
    return (await fileTypeFromBuffer(Buffer.from(data))) ?? null
  }
}
