import { z } from 'zod'

export const uploadOptionsSchema = z.object({
  folder: z.string().optional(),
  generateThumbnail: z.boolean().default(false),
  moderationCheck: z.boolean().default(false),
  expiresIn: z.number().positive().optional(),
  contentType: z.string().optional(),
  maxParts: z.number().positive().max(100).optional(),
})

export const uploadResultSchema = z.object({
  key: z.string(),
  url: z.string(),
  size: z.number().positive(),
})

export const imageVariantsSchema = z.object({
  original: uploadResultSchema,
  thumbnail: uploadResultSchema.optional(),
  medium: uploadResultSchema.optional(),
})

export const multipartUploadPartSchema = z.object({
  ETag: z.string(),
  PartNumber: z.number().positive(),
})

export const callRecordingUploadRequestSchema = z.object({
  callId: z.string().min(1),
  conversationId: z.string().min(1),
  maxParts: z.number().positive().max(100).optional().default(50),
  userPrefix: z.string().optional(),
})

export const completeUploadRequestSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(multipartUploadPartSchema).min(1),
  callId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
})

export const abortUploadRequestSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
})

export type UploadOptions = z.infer<typeof uploadOptionsSchema>
export type UploadResult = z.infer<typeof uploadResultSchema>
export type ImageVariants = z.infer<typeof imageVariantsSchema>
export type MultipartUploadPart = z.infer<typeof multipartUploadPartSchema>
export type CallRecordingUploadRequest = z.infer<typeof callRecordingUploadRequestSchema>
export type CompleteUploadRequest = z.infer<typeof completeUploadRequestSchema>
export type AbortUploadRequest = z.infer<typeof abortUploadRequestSchema>
