import { z } from 'zod'

const selectedServiceSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  included: z.boolean(),
  price: z.number().min(0, 'Price must be positive'),
})

const cargoDetailsSchema = z.object({
  weight: z.number().nullable(),
  volume: z.number().nullable(),
  palletCount: z.number().nullable(),
  fragility: z.enum(['fragile', 'robust']).nullable(),
  dimensions: z.object({
    length: z.number().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable(),
  }),
  options: z.object({
    hazardous: z.boolean(),
    insuranceCoverage: z.boolean(),
    perishableGoods: z.boolean(),
  }),
})

export const createQuoteSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  organizationId: z.string().optional(),
  selectedCategories: z.array(z.string()).min(1, 'At least one category is required'),
  selectedServices: z.array(selectedServiceSchema).min(1, 'At least one service is required'),
  cargoDetails: cargoDetailsSchema,
  vatRate: z.number().min(0).max(100, 'VAT rate must be between 0 and 100'),
  totalHT: z.number().min(0, 'Total HT must be positive'),
  totalTTC: z.number().min(0, 'Total TTC must be positive'),
  vatAmount: z.number().min(0, 'VAT amount must be positive'),
  description: z.string().optional(),
  validUntil: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  legalDocumentIds: z.array(z.uuid()).min(1, 'At least one legal document is required'),
})

export const updateQuoteSchema = z.object({
  selectedCategories: z.array(z.string()).optional(),
  selectedServices: z.array(selectedServiceSchema).optional(),
  cargoDetails: cargoDetailsSchema.optional(),
  description: z.string().optional(),
  validUntil: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  pricing: z
    .object({
      vatRate: z.number().min(0).max(100).optional(),
      totalHT: z.number().min(0).optional(),
      totalTTC: z.number().min(0).optional(),
      vatAmount: z.number().min(0).optional(),
      currency: z.string().optional(),
      discountPercentage: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
    })
    .optional(),
})

export const quoteResponseSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
})

export const quoteIdParamSchema = z.object({
  id: z.string().min(1, 'Quote ID is required'),
})

export const requestIdParamSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
})

export const organizationIdParamSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
})

export type CreateQuoteData = z.infer<typeof createQuoteSchema>
export type UpdateQuoteData = z.infer<typeof updateQuoteSchema>
export type QuoteResponseData = z.infer<typeof quoteResponseSchema>
export type QuoteIdParam = z.infer<typeof quoteIdParamSchema>
export type RequestIdParam = z.infer<typeof requestIdParamSchema>
export type OrganizationIdParam = z.infer<typeof organizationIdParamSchema>
