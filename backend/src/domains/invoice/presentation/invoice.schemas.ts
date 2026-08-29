import { z } from 'zod'

export const createInvoiceSchema = z.object({
  quoteId: z.string().min(1, 'Quote ID is required'),
  dueDate: z
    .string()
    .refine((date) => !Number.isNaN(Date.parse(date)), 'Valid due date is required'),
  description: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
})

export const invoiceIdParamSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
})

export const organizationIdParamSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
})

export const requestIdParamSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
})

export type CreateInvoiceData = z.infer<typeof createInvoiceSchema>
export type InvoiceIdParam = z.infer<typeof invoiceIdParamSchema>
export type OrganizationIdParam = z.infer<typeof organizationIdParamSchema>
export type RequestIdParam = z.infer<typeof requestIdParamSchema>
