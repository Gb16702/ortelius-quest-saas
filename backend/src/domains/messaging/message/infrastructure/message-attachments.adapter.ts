import { v4 as uuidv4 } from 'uuid'
import { validateFile } from '../../../../infrastructure/storage/file-upload.utils'
import { documentsApplicationService } from '../../../documents/documents.application'
import type { Attachment } from '../../domain/messaging.types'
import type { MessageAttachmentPort } from '../application/ports'

export class DocumentMessageAttachmentAdapter implements MessageAttachmentPort {
  async uploadAttachments(input: {
    conversationId: string
    userId: string
    files: File[]
  }): Promise<Attachment[]> {
    if (input.files.length === 0) {
      throw new Error('At least one file is required')
    }

    if (input.files.length > 5) {
      throw new Error('Maximum 5 files allowed per message')
    }

    for (const file of input.files) {
      const validation = validateFile(file, 'CHAT_ATTACHMENTS')
      if (!validation.valid) {
        throw new Error(validation.error || 'File validation failed')
      }
    }

    const uploadedDocuments = await documentsApplicationService.uploadDocuments(input.files, {
      folder: `chat-attachments/${input.conversationId}`,
      allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      maxSize: 10 * 1024 * 1024,
    })

    return uploadedDocuments.map((doc) => ({
      id: uuidv4(),
      filename: doc.filename,
      originalName: doc.originalName,
      size: doc.size,
      mimeType: doc.mimeType,
      s3Key: doc.filename,
      uploadedAt: new Date().toISOString(),
      uploadedBy: input.userId,
    }))
  }
}
