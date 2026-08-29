import { z } from 'zod'

export const uploadOptionsSchema = z.object({
  folder: z.string().optional(),
  generateThumbnail: z.boolean().default(false),
  moderationCheck: z.boolean().default(false),
})

export const uploadResultSchema = z.object({
  key: z.string(),
  url: z.url(),
  size: z.number().positive(),
})

export const imageVariantsSchema = z.object({
  original: uploadResultSchema,
  thumbnail: uploadResultSchema.optional(),
  medium: uploadResultSchema.optional(),
})

export type UploadOptions = z.infer<typeof uploadOptionsSchema>
export type UploadResult = z.infer<typeof uploadResultSchema>
export type ImageVariants = z.infer<typeof imageVariantsSchema>
