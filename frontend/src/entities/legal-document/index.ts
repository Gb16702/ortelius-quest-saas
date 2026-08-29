export {
    fetchLegalDocumentDownloadUrl,
    fetchLegalDocuments,
    useLegalDocumentsList,
} from "./api/legal-document.api"
export { legalDocumentsQueryKey } from "./api/legal-document.query-keys"
export type {
    DownloadUrlResponse,
    LegalDocument,
    ListLegalDocumentsResponse,
    UpdateLegalDocumentInput,
    UploadLegalDocumentMetadata,
} from "./model/legal-document"
export {
    downloadUrlResponseSchema,
    getLegalDocumentsErrorMessage,
    legalDocumentLabelSchema,
    legalDocumentMutationResponseSchema,
    legalDocumentSchema,
    legalDocumentsApiResponseSchema,
    listLegalDocumentsResponseSchema,
    unwrapLegalDocumentsApiData,
} from "./model/legal-document.schema"
