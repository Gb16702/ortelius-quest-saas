import { useQuery } from "@tanstack/react-query"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { legalDocumentsQueryKey } from "../api/legal-document.query-keys"
import type { DownloadUrlResponse, ListLegalDocumentsResponse } from "../model/legal-document"
import {
    downloadUrlResponseSchema,
    getLegalDocumentsErrorMessage,
    listLegalDocumentsResponseSchema,
    unwrapLegalDocumentsApiData,
} from "../model/legal-document.schema"

export async function fetchLegalDocuments(
    organizationId: string
): Promise<ListLegalDocumentsResponse> {
    const response = await fetch(`/api/organizations/${organizationId}/legal-documents`, {
        credentials: "include",
    })

    const payload = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(getLegalDocumentsErrorMessage(payload, "Failed to fetch legal documents"))
    }

    return parseSchema(
        listLegalDocumentsResponseSchema,
        unwrapLegalDocumentsApiData(payload, "Failed to fetch legal documents")
    )
}

export function useLegalDocumentsList(organizationId: string | null) {
    return useQuery({
        queryKey: legalDocumentsQueryKey(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchLegalDocuments(organizationId)
        },
        enabled: !!organizationId,
    })
}

export async function fetchLegalDocumentDownloadUrl(
    organizationId: string,
    documentId: string
): Promise<DownloadUrlResponse> {
    const response = await fetch(
        `/api/organizations/${organizationId}/legal-documents/${documentId}/download-url`,
        { credentials: "include" }
    )

    const payload = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(getLegalDocumentsErrorMessage(payload, "Failed to fetch download URL"))
    }

    return parseSchema(
        downloadUrlResponseSchema,
        unwrapLegalDocumentsApiData(payload, "Failed to fetch download URL")
    )
}
