import {
  AbortUploadUseCase,
  CompleteUploadUseCase,
  GenerateUploadUrlsUseCase,
} from '../application/storage-use-cases'
import { S3StorageAdapter } from './s3-storage.adapter'
import { CallsTranscriptionQueueAdapter } from './transcription-queue.adapter'

let storageUseCases: {
  generateUploadUrls: GenerateUploadUrlsUseCase
  completeUpload: CompleteUploadUseCase
  abortUpload: AbortUploadUseCase
} | null = null

export async function getStorageUseCases() {
  if (!storageUseCases) {
    const storage = new S3StorageAdapter()
    const transcriptionQueue = new CallsTranscriptionQueueAdapter()

    storageUseCases = {
      generateUploadUrls: new GenerateUploadUrlsUseCase(storage),
      completeUpload: new CompleteUploadUseCase(storage, transcriptionQueue),
      abortUpload: new AbortUploadUseCase(storage),
    }
  }

  return storageUseCases
}
