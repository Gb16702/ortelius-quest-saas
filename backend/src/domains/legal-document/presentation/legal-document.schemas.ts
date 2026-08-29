import { z } from 'zod'

export const legalDocumentScanStatusSchema = z.enum(['pending', 'clean', 'infected', 'error'])

export const legalDocumentSchema = z.object({
  id: z.uuid(),
  organizationId: z.string(),
  label: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  mimeType: z.literal('application/pdf'),
  originalFilename: z.string().min(1).max(255),
  scanStatus: legalDocumentScanStatusSchema,
  uploadedById: z.string(),
  uploadedByName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type LegalDocument = z.infer<typeof legalDocumentSchema>

export const listLegalDocumentsResponseSchema = z.object({
  documents: z.array(legalDocumentSchema),
  totalSizeBytes: z.number().int().nonnegative(),
  quotaBytes: z.number().int().positive(),
})

export type ListLegalDocumentsResponse = z.infer<typeof listLegalDocumentsResponseSchema>

export const uploadLegalDocumentMetadataSchema = z.object({
  label: z.string().min(1).max(255).optional(),
})

export type UploadLegalDocumentMetadata = z.infer<typeof uploadLegalDocumentMetadataSchema>

export const uploadLegalDocumentMetadataArraySchema = z.array(uploadLegalDocumentMetadataSchema)

export const updateLegalDocumentSchema = z
  .object({
    label: z.string().min(1).max(255).optional(),
  })
  .refine((d) => d.label !== undefined, {
    message: 'At least one field must be provided',
  })

export type UpdateLegalDocumentInput = z.infer<typeof updateLegalDocumentSchema>

export const downloadUrlResponseSchema = z.object({
  url: z.url(),
  expiresAt: z.string(),
})

export type DownloadUrlResponse = z.infer<typeof downloadUrlResponseSchema>

export const organizationIdParamSchema = z.object({
  organizationId: z.string().min(1),
})

export const documentIdParamSchema = z.object({
  organizationId: z.string().min(1),
  documentId: z.uuid(),
})
