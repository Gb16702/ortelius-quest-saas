import { z } from 'zod'

export const createRequestSchema = z.object({
  requesterEmail: z.string().email('Valid email is required'),
  requesterName: z.string().min(1, 'Requester name is required'),
  requesterId: z.string().optional(),
  receiverOrganizationId: z.string().min(1, 'Organization ID is required'),
  categories: z.array(z.string()),
  services: z.array(z.string()).optional(),
  extraServices: z.array(z.string()).optional(),
  cargoDetails: z
    .object({
      weight: z.number().positive().optional(),
      volume: z.number().positive().optional(),
      dimensions: z
        .object({
          length: z.number().positive().optional(),
          width: z.number().positive().optional(),
          height: z.number().positive().optional(),
        })
        .optional(),
      palletCount: z.number().int().positive().optional(),
      fragility: z.enum(['fragile', 'robust']).optional(),
      options: z.record(z.string(), z.boolean()).optional(),
    })
    .optional(),
  comments: z.string().optional(),
  documents: z.array(z.string()).optional(),
  fromDate: z.coerce.date().min(new Date(0), 'Invalid from date'),
  toDate: z.coerce.date().min(new Date(0), 'Invalid to date'),
})

export const updateRequestSchema = createRequestSchema.omit({ requesterId: true }).partial()

export const requestIdParamSchema = z.object({
  id: z.string().min(1, 'Request ID is required'),
})

export const requestNumberParamSchema = z.object({
  requestNumber: z.string().min(1, 'Request number is required'),
})

export const rejectRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
})

export const requestFiltersSchema = z.object({
  lifecycleStatus: z.string().optional(),
  closedReason: z.string().optional(),
  organizationId: z.string().optional(),
  search: z.string().optional(),
  assignedTo: z.union([z.string(), z.array(z.string())]).optional(),
  priority: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  categories: z.array(z.string()).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
})

export const linkRequestsSchema = z.object({
  userEmail: z.string().email('Valid email is required'),
})

export const assignRequestSchema = z.object({
  assignedToId: z.string().min(1, 'User ID is required'),
})

const _quoteCargoDetailSchema = z.object({
  amount: z.number(),
  checked: z.boolean(),
  price: z.number().optional(),
})

const quoteCargoDetailsSchema = z.object({
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

const selectedCategoriesSchema = z.array(z.string())

const selectedServicesSchema = z.array(
  z.object({
    serviceId: z.string(),
    included: z.boolean(),
    price: z.number(),
  })
)

const _quoteTimingSchema = z.object({
  fromDate: z.number(),
  toDate: z.number(),
  comment: z.string().optional(),
})

const quoteDocumentSchema = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.url().optional(),
})

const _quoteDocumentsSchema = z.object({
  documents: z.array(quoteDocumentSchema),
  comment: z.string().optional(),
})

const _quoteCommentsSchema = z.object({
  comment: z.string(),
  additionalComment: z.string(),
})

const quoteServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().positive().optional(),
})

const _quotePricingSchema = z.object({
  services: z.array(quoteServiceSchema),
  vatRate: z.number().min(0).max(100),
  totalHT: z.number(),
  vatAmount: z.number(),
  totalTTC: z.number(),
  currency: z.enum(['EUR', 'USD', 'GBP']),
  discountPercentage: z.number().min(0).max(100).optional(),
  discountAmount: z.number().optional(),
  notes: z.string().optional(),
})

export const createQuoteSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required').optional(),
  selectedCategories: selectedCategoriesSchema,
  selectedServices: selectedServicesSchema,
  cargoDetails: quoteCargoDetailsSchema,
  generalFeedback: z.string().optional(),
  description: z.string().optional(),
  vatRate: z.number().min(0).max(100),
  totalHT: z.number(),
  totalTTC: z.number(),
  vatAmount: z.number(),
  validUntil: z.date().optional(),
})

export const updateQuoteSchema = z.object({
  selectedCategories: selectedCategoriesSchema.optional(),
  selectedServices: selectedServicesSchema.optional(),
  cargoDetails: quoteCargoDetailsSchema.optional(),
  generalFeedback: z.string().optional(),
  description: z.string().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  totalHT: z.number().optional(),
  totalTTC: z.number().optional(),
  vatAmount: z.number().optional(),
  validUntil: z.date().optional(),
  rejectionReason: z.string().optional(),
})

export const quoteResponseSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
})

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  website: z.url({ message: 'Invalid website URL' }).optional(),
  phone: z.string().optional(),
  email: z.email({ message: 'Invalid email address' }).optional(),
  address: z.string().optional(),
  logo: z.url({ message: 'Invalid logo URL' }).optional(),
})

export const updateOrganizationSchema = createOrganizationSchema.partial()

export const messageSchema = z.object({
  conversationId: z.uuid({ message: 'Invalid conversation ID' }),
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
  type: z.enum(['text', 'image', 'document']).optional().default('text'),
})

export const paginationSchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  cursor: z.string().optional(),
})

export const organizationMemberSchema = z.object({
  userId: z.uuid({ message: 'Invalid user ID' }),
  role: z.enum(['admin', 'member', 'viewer']),
})

export const documentUploadSchema = z.object({
  requestId: z.uuid({ message: 'Invalid request ID' }),
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
  size: z.number().positive('File size must be positive'),
})

export type CreateRequestInput = z.infer<typeof createRequestSchema>
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>
export type QuoteResponseInput = z.infer<typeof quoteResponseSchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type MessageInput = z.infer<typeof messageSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type OrganizationMemberInput = z.infer<typeof organizationMemberSchema>
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>
export type RequestFiltersInput = z.infer<typeof requestFiltersSchema>
export type LinkRequestsInput = z.infer<typeof linkRequestsSchema>
