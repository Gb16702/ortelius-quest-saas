import { z } from 'zod'
import { BRAND_COLOR_VALUES, ORGANIZATION_FONT_IDS } from '../domain'

export const organizationSlugParamSchema = z.object({
  slug: z.string().min(1, 'Organization slug is required'),
})

export const organizationIdParamSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
})

export const invitationIdParamSchema = z.object({
  invitationId: z.uuid('Invalid invitation ID format'),
})

export const memberIdParamSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  memberId: z.string().min(1, 'Member ID is required'),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
})

const ALLOWED_MEMBER_ROLES = ['owner', 'admin', 'member', 'all', 'empty'] as const

export const memberFilterQuerySchema = z.object({
  search: z.string().optional(),
  role: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        return val
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)
          .every((r) => ALLOWED_MEMBER_ROLES.includes(r as (typeof ALLOWED_MEMBER_ROLES)[number]))
      },
      {
        message: `Role must be one of: ${ALLOWED_MEMBER_ROLES.join(', ')} (or a comma-separated list)`,
      }
    ),
  sortBy: z.enum(['name', 'role', 'joinedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export const requestFilterQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const invitationFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  archived: z.coerce.boolean().optional(),
})

export const updateInvitationRoleSchema = z.object({
  role: z.enum(['admin', 'member']).refine((val) => ['admin', 'member'].includes(val), {
    message: 'Role must be admin or member',
  }),
})

export const archiveInvitationsSchema = z.object({
  invitationIds: z
    .array(z.uuid('Invalid invitation ID format'))
    .min(1, 'At least one invitation ID is required'),
})

export const brandColorSchema = z.enum(BRAND_COLOR_VALUES, {
  message: `Brand color must be one of: ${BRAND_COLOR_VALUES.join(', ')}`,
})

export const organizationFontSchema = z.enum(ORGANIZATION_FONT_IDS, {
  error: `Font must be one of: ${ORGANIZATION_FONT_IDS.join(', ')}`,
})

export const updateOrganizationSettingsSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(120).optional(),
  slug: z.string().min(1, 'Organization slug is required').optional(),
  tagline: z.string().max(80, 'Tagline must be 80 characters or less').optional().nullable(),
  overview: z.string().max(2000, 'Overview must be 2000 characters or less').optional().nullable(),
  website: z
    .string()
    .max(255, 'URL must be 255 characters or less')
    .refine(
      (val) => {
        if (!val) return true
        try {
          const url = new URL(val)
          return url.protocol === 'https:'
        } catch {
          return false
        }
      },
      { message: 'Please enter a valid HTTPS URL' }
    )
    .optional()
    .nullable()
    .or(z.literal('')),
  brandColor: brandColorSchema.optional(),
  font: organizationFontSchema.optional(),
})

export const sendShowcaseEmailsSchema = z.object({
  emails: z
    .array(z.string().email('Invalid email address'))
    .min(1, 'At least one email address is required')
    .max(100, 'Maximum 100 email addresses allowed'),
})

export const showcaseMetricsQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .refine((val) => !val || [7, 30, 90, 365].includes(val), {
      message: 'Days must be 7, 30, 90, or 365',
    }),
})

export const updateEmailIntakeSchema = z.object({
  enabled: z.boolean(),
})
