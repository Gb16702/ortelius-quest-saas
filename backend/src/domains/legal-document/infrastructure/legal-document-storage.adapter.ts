import { s3Service } from '../../../infrastructure/storage/s3.service'
import type { LegalDocumentStoragePort } from '../application/ports'

export class S3LegalDocumentStorageAdapter implements LegalDocumentStoragePort {
  async uploadBuffer(input: {
    key: string
    data: Uint8Array
    contentType: 'application/pdf'
    metadata: Record<string, string>
  }): Promise<void> {
    await s3Service.uploadBuffer(input.key, Buffer.from(input.data), input.contentType, {
      metadata: input.metadata,
    })
  }

  getDownloadUrl(key: string, expiresInSeconds: number, filename: string): Promise<string> {
    return s3Service.getDownloadUrl(key, expiresInSeconds, filename)
  }
}
