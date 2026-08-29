import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { legalDocumentsQueryKey } from "@/entities/legal-document"
import {
    applyOptimisticOrganizationSetupStatusPatch,
    invalidateOrganizationSetupStatus,
} from "@/entities/organization"
import { LegalDocumentUploadError, uploadLegalDocument } from "../../api/legal-documents.mutations"
import type { LegalDocument, StagedFile } from "../legal-documents"

const BYTES_PER_MB = 1024 * 1024

function formatMb(bytes: number): string {
    return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`
}

function describeUploadError(
    err: unknown,
    t: (key: string, options?: Record<string, unknown>) => string
): string {
    if (err instanceof LegalDocumentUploadError) {
        if (err.code === "OVERSIZE") {
            return t("legalDocuments.error.oversize")
        }
        if (err.code === "QUOTA" && err.details) {
            const { currentSizeBytes, quotaBytes } = err.details
            return t("legalDocuments.error.quotaWithCurrent", {
                quota: formatMb(quotaBytes),
                current: formatMb(currentSizeBytes),
            })
        }
        if (err.code === "NETWORK") {
            return t("legalDocuments.error.network")
        }
    }
    return err instanceof Error ? err.message : t("legalDocuments.error.uploadFailed")
}

export interface UploadAllResult {
    uploadedDocuments: LegalDocument[]
    failedStaged: StagedFile[]
}

interface UseLegalDocumentsUploadResult {
    isUploading: boolean
    uploadAll: (
        organizationId: string,
        files: StagedFile[],
        onUpdate: (id: string, partial: Partial<StagedFile>) => void
    ) => Promise<UploadAllResult>
}

export function useLegalDocumentsUpload(): UseLegalDocumentsUploadResult {
    const { t } = useTranslation("settings")
    const queryClient = useQueryClient()
    const [isUploading, setIsUploading] = useState(false)

    const uploadAll = useCallback(
        async (
            organizationId: string,
            files: StagedFile[],
            onUpdate: (id: string, partial: Partial<StagedFile>) => void
        ): Promise<UploadAllResult> => {
            setIsUploading(true)
            const uploadedDocuments: LegalDocument[] = []
            const failedStaged: StagedFile[] = []

            await Promise.all(
                files.map(async (staged) => {
                    onUpdate(staged.id, { status: "uploading", progress: 0, errorMessage: null })
                    try {
                        const created = await uploadLegalDocument(organizationId, {
                            file: staged.file,
                            label: staged.label,
                            onProgress: (percent) => onUpdate(staged.id, { progress: percent }),
                        })
                        onUpdate(staged.id, { status: "uploaded", progress: 100 })
                        uploadedDocuments.push(created)
                    } catch (err) {
                        onUpdate(staged.id, {
                            status: "error",
                            errorMessage: describeUploadError(err, t),
                        })
                        failedStaged.push(staged)
                    }
                })
            )

            queryClient.invalidateQueries({
                queryKey: legalDocumentsQueryKey(organizationId),
            })
            if (uploadedDocuments.length > 0) {
                await applyOptimisticOrganizationSetupStatusPatch(queryClient, organizationId, {
                    hasLegalDocuments: true,
                })
                invalidateOrganizationSetupStatus(queryClient, organizationId)
            }
            setIsUploading(false)
            return { uploadedDocuments, failedStaged }
        },
        [queryClient, t]
    )

    return { isUploading, uploadAll }
}
