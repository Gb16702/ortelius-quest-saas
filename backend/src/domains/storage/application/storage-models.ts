export interface UploadOptions {
  folder?: string
  generateThumbnail?: boolean
  moderationCheck?: boolean
  expiresIn?: number
  contentType?: string
  maxParts?: number
}

export interface UploadResult {
  key: string
  url: string
  size: number
}

export interface ImageVariants {
  original: UploadResult
  thumbnail?: UploadResult
  medium?: UploadResult
}

export interface PreSignedUploadUrls {
  uploadId: string
  key: string
  urls: string[]
  completeUrl: string
  abortUrl: string
  callId?: string
  conversationId?: string
  expiresAt?: string
}

export interface PreSignedUrlOptions {
  expiresIn?: number
  contentType?: string
  maxParts?: number
}

export interface MultipartUploadPart {
  ETag: string
  PartNumber: number
}

export interface CallRecordingUploadRequest {
  callId: string
  conversationId: string
  maxParts?: number
  userPrefix?: string
}

export interface CompleteUploadRequest {
  key: string
  uploadId: string
  parts: MultipartUploadPart[]
  callId?: string
  conversationId?: string
}

export interface AbortUploadRequest {
  key: string
  uploadId: string
}

export interface UploadCompleteResponse {
  success: boolean
  location: string
  transcriptId?: string
  message: string
}

export interface SpeakerInfo {
  userId: string
  userName: string
}

export interface TranscriptionJob {
  id: string
  audioKey: string
  callId: string
  conversationId: string
  speakerInfo: SpeakerInfo
  options: {
    prompt: string
  }
}
