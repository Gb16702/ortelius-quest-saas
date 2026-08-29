import { z } from 'zod'

export const checkAuthProviderSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export const organizationIdParamSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
})

export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export const roleSchema = z.enum(['viewer', 'member', 'admin'])

export const membershipSchema = z.object({
  role: roleSchema,
  organizationId: z.string().min(1, 'Organization ID is required'),
  organizationName: z.string().min(1, 'Organization name is required'),
})

export const authUserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  image: z.string().optional(),
  role: z.string(),
  banner: z.string().optional(),
})

export type CheckAuthProviderInput = z.infer<typeof checkAuthProviderSchema>
export type OrganizationIdParam = z.infer<typeof organizationIdParamSchema>
export type UserIdParam = z.infer<typeof userIdParamSchema>
export type RoleInput = z.infer<typeof roleSchema>
export type MembershipInput = z.infer<typeof membershipSchema>
export type AuthUserInput = z.infer<typeof authUserSchema>
