import { z } from 'zod'

export const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  type: z.enum(['cargo', 'storage', 'logistics', 'port']),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const serviceWithSelectionStatusSchema = serviceSchema.extend({
  isSelected: z.boolean(),
})

export const organizationIdParamSchema = z.object({
  organizationId: z.string().min(1),
})

export const patchOrganizationServicesSchema = z
  .object({
    add: z.array(z.string().min(1)).optional(),
    remove: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => data.add || data.remove, {
    message: "At least one of 'add' or 'remove' must be provided",
  })

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type ServiceInput = z.infer<typeof serviceSchema>
export type ServiceWithSelectionStatusInput = z.infer<typeof serviceWithSelectionStatusSchema>
export type OrganizationIdParam = z.infer<typeof organizationIdParamSchema>
export type PatchOrganizationServicesInput = z.infer<typeof patchOrganizationServicesSchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
