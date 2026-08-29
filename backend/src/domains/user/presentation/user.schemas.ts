import { z } from 'zod'
import { USER_STATUSES } from '../domain'

export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export const updateUserNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(64, 'Name must be less than 64 characters'),
})

export const updateStatusSchema = z.object({
  status: z.enum(USER_STATUSES),
})

export type UpdateStatus = z.infer<typeof updateStatusSchema>

export const imageUploadSchema = z.object({
  image: z.any().refine((file) => file instanceof File, 'Image file is required'),
})

export const bannerUploadSchema = z.object({
  banner: z.any().refine((file) => file instanceof File, 'Banner file is required'),
})

export type UserIdParam = z.infer<typeof userIdParamSchema>
export type ImageUpload = z.infer<typeof imageUploadSchema>
export type BannerUpload = z.infer<typeof bannerUploadSchema>
export type UpdateUserName = z.infer<typeof updateUserNameSchema>
