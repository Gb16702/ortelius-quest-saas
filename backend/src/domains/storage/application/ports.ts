import type {
  MultipartUploadPart,
  PreSignedUploadUrls,
  PreSignedUrlOptions,
  TranscriptionJob,
} from './storage-models'

export interface StorageRepositoryPort {
  generateMultipartUploadUrls(
    key: string,
    options?: PreSignedUrlOptions
  ): Promise<PreSignedUploadUrls>
  completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: MultipartUploadPart[]
  ): Promise<string>
  abortMultipartUpload(key: string, uploadId: string): Promise<void>
}

export interface TranscriptionQueuePort {
  addJob(job: TranscriptionJob): Promise<void>
}
