import { FILE_TYPES, validateFile } from '../../../infrastructure/storage/file-upload.utils'
import { documentsApplicationService } from '../../documents/documents.application'
import type { AssistantAttachment } from '../application/assistant-models'
import type { AssistantRepositoryPort } from '../application/ports'

export const ASSISTANT_ATTACHMENT_MAX_FILES = 5
export const ASSISTANT_ATTACHMENT_FILE_CONFIG = FILE_TYPES.CHAT_ATTACHMENTS

export interface UploadAssistantAttachmentsInput {
  userId: string
  organizationId?: string | null
  files: File[]
  repository: AssistantRepositoryPort
}

export async function uploadAssistantAttachments(
  input: UploadAssistantAttachmentsInput
): Promise<AssistantAttachment[]> {
  if (input.files.length === 0) {
    throw new Error('At least one file is required')
  }

  if (input.files.length > ASSISTANT_ATTACHMENT_MAX_FILES) {
    throw new Error('Maximum 5 files allowed per message')
  }

  for (const file of input.files) {
    const validation = validateFile(file, 'CHAT_ATTACHMENTS')
    if (!validation.valid) {
      throw new Error(validation.error || 'File validation failed')
    }
  }

  const uploadedDocuments = await documentsApplicationService.uploadDocuments(input.files, {
    folder: `assistant-attachments/${input.userId}`,
    allowedTypes: ASSISTANT_ATTACHMENT_FILE_CONFIG.mimeTypes,
    maxSize: ASSISTANT_ATTACHMENT_FILE_CONFIG.maxSize,
  })

  return input.repository.createAttachments(
    uploadedDocuments.map((doc) => ({
      userId: input.userId,
      organizationId: input.organizationId,
      filename: doc.filename,
      originalName: doc.originalName,
      size: doc.size,
      mimeType: doc.mimeType,
      s3Key: doc.filename,
    }))
  )
}
