import type * as v from "valibot"
import type {
    downloadUrlResponseSchema,
    legalDocumentMutationResponseSchema,
    legalDocumentSchema,
    listLegalDocumentsResponseSchema,
    updateLegalDocumentSchema,
    uploadLegalDocumentMetadataSchema,
} from "./legal-document.schema"

export type LegalDocument = v.InferOutput<typeof legalDocumentSchema>
export type LegalDocumentMutationResponse = v.InferOutput<
    typeof legalDocumentMutationResponseSchema
>
export type ListLegalDocumentsResponse = v.InferOutput<typeof listLegalDocumentsResponseSchema>
export type UploadLegalDocumentMetadata = v.InferOutput<typeof uploadLegalDocumentMetadataSchema>
export type UpdateLegalDocumentInput = v.InferOutput<typeof updateLegalDocumentSchema>
export type DownloadUrlResponse = v.InferOutput<typeof downloadUrlResponseSchema>
