import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as v from "valibot"
import {
    type LegalDocument,
    type ListLegalDocumentsResponse,
    legalDocumentMutationResponseSchema,
    legalDocumentSchema,
    legalDocumentsApiResponseSchema,
    legalDocumentsQueryKey,
    type UpdateLegalDocumentInput,
} from "@/entities/legal-document"
import {
    applyOptimisticOrganizationSetupStatusPatch,
    invalidateOrganizationSetupStatus,
    restoreOrganizationSetupStatus,
} from "@/entities/organization"
import { parseEmptySuccessResponse, parseJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

const quotaErrorDetailsSchema = v.object({
    currentSizeBytes: v.number(),
    incomingSizeBytes: v.number(),
    quotaBytes: v.number(),
})

const uploadLegalDocumentResponseSchema = v.looseObject({
    ...legalDocumentsApiResponseSchema.entries,
    data: v.object({
        documents: v.pipe(v.array(legalDocumentSchema), v.minLength(1)),
    }),
})

const uploadLegalDocumentErrorSchema = v.looseObject({
    message: v.optional(v.string()),
    details: v.optional(quotaErrorDetailsSchema),
})

function getUploadErrorPayload(payload: unknown) {
    const result = v.safeParse(uploadLegalDocumentErrorSchema, payload)
    return result.success ? result.output : null
}

function parseUploadResponseText(text: string): unknown {
    try {
        return JSON.parse(text || "{}") as unknown
    } catch {
        return {}
    }
}

export type QuotaErrorDetails = v.InferOutput<typeof quotaErrorDetailsSchema>

export type UploadErrorCode = "OVERSIZE" | "QUOTA" | "NETWORK" | "OTHER"

export class LegalDocumentUploadError extends Error {
    code: UploadErrorCode
    details?: QuotaErrorDetails

    constructor(message: string, code: UploadErrorCode, details?: QuotaErrorDetails) {
        super(message)
        this.name = "LegalDocumentUploadError"
        this.code = code
        this.details = details
    }
}

interface UploadOneInput {
    file: File
    label: string
    onProgress: (percent: number) => void
}

export function uploadLegalDocument(
    organizationId: string,
    { file, label, onProgress }: UploadOneInput
): Promise<LegalDocument> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append("files", file)
        formData.append("metadata", JSON.stringify([{ label }]))

        xhr.open("POST", `/api/organizations/${organizationId}/legal-documents`, true)
        xhr.withCredentials = true

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100))
            }
        }

        xhr.onload = () => {
            try {
                const payload = parseUploadResponseText(xhr.responseText)
                if (xhr.status < 200 || xhr.status >= 300) {
                    const errorPayload = getUploadErrorPayload(payload)
                    const fallback = errorPayload?.message ?? `Upload failed (${xhr.status})`
                    if (xhr.status === 413) {
                        if (
                            errorPayload?.details &&
                            typeof errorPayload.details.quotaBytes === "number"
                        ) {
                            reject(
                                new LegalDocumentUploadError(
                                    fallback,
                                    "QUOTA",
                                    errorPayload.details
                                )
                            )
                        } else {
                            reject(new LegalDocumentUploadError(fallback, "OVERSIZE"))
                        }
                        return
                    }
                    reject(new LegalDocumentUploadError(fallback, "OTHER"))
                    return
                }
                const parsed = parseSchema(uploadLegalDocumentResponseSchema, payload)
                resolve(parsed.data.documents[0])
            } catch (err) {
                reject(err instanceof Error ? err : new Error("Invalid upload response"))
            }
        }

        xhr.onerror = () =>
            reject(new LegalDocumentUploadError("Network error during upload", "NETWORK"))
        xhr.onabort = () => reject(new LegalDocumentUploadError("Upload aborted", "OTHER"))

        xhr.send(formData)
    })
}

interface RenameMutationContext {
    previous: ListLegalDocumentsResponse | undefined
}

export function useRenameLegalDocument(organizationId: string | null) {
    const queryClient = useQueryClient()
    const queryKey = legalDocumentsQueryKey(organizationId)

    return useMutation<
        LegalDocument,
        Error,
        { documentId: string; input: UpdateLegalDocumentInput },
        RenameMutationContext
    >({
        mutationFn: async ({ documentId, input }) => {
            if (!organizationId) throw new Error("organizationId is required")
            const response = await fetch(
                `/api/organizations/${organizationId}/legal-documents/${documentId}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                }
            )

            return parseJsonResponse(
                response,
                legalDocumentMutationResponseSchema,
                "Failed to rename document"
            )
        },
        onMutate: async ({ documentId, input }) => {
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<ListLegalDocumentsResponse>(queryKey)
            if (previous) {
                queryClient.setQueryData<ListLegalDocumentsResponse>(queryKey, {
                    ...previous,
                    documents: previous.documents.map((doc) =>
                        doc.id === documentId ? { ...doc, label: input.label } : doc
                    ),
                })
            }
            return { previous }
        },
        onError: (_error, _variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey })
        },
    })
}

interface DeleteMutationContext {
    previous: ListLegalDocumentsResponse | undefined
    setupContext?: Awaited<ReturnType<typeof applyOptimisticOrganizationSetupStatusPatch>>
}

export function useDeleteLegalDocument(organizationId: string | null) {
    const queryClient = useQueryClient()
    const queryKey = legalDocumentsQueryKey(organizationId)

    return useMutation<void, Error, string, DeleteMutationContext>({
        mutationFn: async (documentId) => {
            if (!organizationId) throw new Error("organizationId is required")
            const response = await fetch(
                `/api/organizations/${organizationId}/legal-documents/${documentId}`,
                { method: "DELETE", credentials: "include" }
            )

            await parseEmptySuccessResponse(response, "Failed to delete document")
        },
        onMutate: async (documentId) => {
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<ListLegalDocumentsResponse>(queryKey)
            if (previous && organizationId) {
                const removed = previous.documents.find((doc) => doc.id === documentId)
                const nextDocuments = previous.documents.filter((doc) => doc.id !== documentId)
                queryClient.setQueryData<ListLegalDocumentsResponse>(queryKey, {
                    ...previous,
                    documents: nextDocuments,
                    totalSizeBytes: removed
                        ? Math.max(0, previous.totalSizeBytes - removed.sizeBytes)
                        : previous.totalSizeBytes,
                })

                const setupContext = await applyOptimisticOrganizationSetupStatusPatch(
                    queryClient,
                    organizationId,
                    { hasLegalDocuments: nextDocuments.length > 0 }
                )
                return { previous, setupContext }
            }
            return { previous }
        },
        onError: (_error, _variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous)
            }
            if (organizationId) {
                restoreOrganizationSetupStatus(queryClient, organizationId, context?.setupContext)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey })
            if (organizationId) {
                invalidateOrganizationSetupStatus(queryClient, organizationId)
            }
        },
    })
}
