import { z } from 'zod'

export const invitationIdParamSchema = z.object({
  invitationId: z.string().min(1, 'Invalid invitation ID format'),
})

export const organizationIdParamSchema = z.object({
  organizationId: z.string().min(1, 'Invalid organization ID format'),
})

export const invitationFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  archived: z.coerce.boolean().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const updateInvitationRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
})

export const archiveInvitationsSchema = z.object({
  invitationIds: z
    .array(z.string().min(1, 'Invalid invitation ID format'))
    .min(1, 'At least one invitation ID is required'),
})

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'owner']).default('member'),
  organizationId: z.string().min(1, 'Invalid organization ID'),
})
