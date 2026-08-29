import { z } from 'zod'
import type { QuoteLegalDocumentDownload, QuoteLegalDocumentsList } from '../application/ports'

export const quoteLegalDocumentItemSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  originalFilename: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  downloadUrl: z.url(),
  downloadUrlExpiresAt: z.string(),
}) satisfies z.ZodType<QuoteLegalDocumentDownload>

export const quoteLegalDocumentsSchema = z.array(
  quoteLegalDocumentItemSchema
) satisfies z.ZodType<QuoteLegalDocumentsList>

export type QuoteLegalDocumentItem = z.infer<typeof quoteLegalDocumentItemSchema>
export type { QuoteLegalDocumentsList }
