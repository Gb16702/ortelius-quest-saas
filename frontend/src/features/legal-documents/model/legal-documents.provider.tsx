import {
    createContext,
    type ReactNode,
    use,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
    fetchLegalDocumentDownloadUrl,
    legalDocumentLabelSchema,
    useLegalDocumentsList,
} from "@/entities/legal-document"
import { useOrg } from "@/entities/organization"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    showPendingToast,
    showPromiseToast,
    showRetryErrorToast,
    showSuccessToast,
    showUndoToast,
    toast,
} from "@/shared/ui/toasts"
import { useDeleteLegalDocument, useRenameLegalDocument } from "../api/legal-documents.mutations"
import { LEGAL_DOCUMENT_FILE_CONFIG } from "../lib/legal-document-upload.config"
import { useLegalDocumentsUpload } from "./hooks/use-legal-documents-upload"
import type { LegalDocument, LegalDocumentsContextValue, StagedFile } from "./legal-documents"

const PRESET = LEGAL_DOCUMENT_FILE_CONFIG

const LegalDocumentsContext = createContext<LegalDocumentsContextValue | null>(null)

export function useLegalDocumentsContext(): LegalDocumentsContextValue {
    const ctx = use(LegalDocumentsContext)
    if (!ctx) {
        throw new Error("useLegalDocumentsContext must be used within LegalDocumentsProvider")
    }
    return ctx
}

function sanitizeLabelFromFilename(filename: string): string {
    const trimmed = filename.replace(/\.pdf$/i, "")
    return trimmed.length > 0 ? trimmed : filename
}

function makeStagedFile(file: File): StagedFile {
    return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        label: sanitizeLabelFromFilename(file.name),
        progress: 0,
        status: "queued",
        errorMessage: null,
    }
}

interface LegalDocumentsProviderProps {
    children: ReactNode
}

export function LegalDocumentsProvider({ children }: LegalDocumentsProviderProps) {
    const { t } = useTranslation("settings")
    const { state: orgState } = useOrg()
    const organizationId = orgState.org.id

    const listQuery = useLegalDocumentsList(organizationId)
    useEffect(() => {
        if (!listQuery.isError) return
        showRetryErrorToast(t("legalDocuments.toast.loadFailed"), {
            onRetry: () => listQuery.refetch(),
        })
    }, [listQuery.isError, listQuery.refetch, t])

    const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
    const [renameTarget, setRenameTarget] = useState<LegalDocument | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<LegalDocument | null>(null)
    const [validationError, setValidationError] = useState<string | null>(null)

    const { isUploading, uploadAll } = useLegalDocumentsUpload()
    const renameMutation = useRenameLegalDocument(organizationId)
    const deleteMutation = useDeleteLegalDocument(organizationId)

    const documents = listQuery.data?.documents ?? []
    const totalSizeBytes = listQuery.data?.totalSizeBytes ?? 0
    const quotaBytes = listQuery.data?.quotaBytes ?? PRESET.maxSize * PRESET.maxFiles

    const validateFile = useCallback(
        (file: File): string | null => {
            const isPdfMime = file.type === "application/pdf"
            const isPdfExtension = file.name.toLowerCase().endsWith(".pdf")
            if (!isPdfMime && !isPdfExtension) return t("legalDocuments.error.wrongFormat")
            if (file.size > PRESET.maxSize) return t("legalDocuments.error.oversize")
            return null
        },
        [t]
    )

    const updateStaged = useCallback((id: string, partial: Partial<StagedFile>) => {
        setStagedFiles((prev) => {
            if (partial.status === "uploaded") {
                return prev.filter((staged) => staged.id !== id)
            }
            return prev.map((staged) => (staged.id === id ? { ...staged, ...partial } : staged))
        })
    }, [])

    const addStagedFiles = useCallback(
        (files: File[]) => {
            if (files.length === 0) return
            let acceptedCount = 0
            setStagedFiles((prev) => {
                const remainingSlots = PRESET.maxFiles - prev.length
                if (remainingSlots <= 0) {
                    setValidationError(
                        t("legalDocuments.error.tooMany", { count: PRESET.maxFiles })
                    )
                    return prev
                }
                const accepted: StagedFile[] = []
                const rejected: string[] = []
                for (const file of files.slice(0, remainingSlots)) {
                    const error = validateFile(file)
                    if (error) {
                        rejected.push(`${file.name}: ${error}`)
                        continue
                    }
                    accepted.push(makeStagedFile(file))
                }
                if (files.length > remainingSlots) {
                    rejected.push(t("legalDocuments.error.tooMany", { count: PRESET.maxFiles }))
                }
                if (rejected.length > 0) {
                    setValidationError(rejected[0] ?? null)
                } else if (accepted.length > 0) {
                    setValidationError(null)
                }
                acceptedCount = accepted.length
                return [...prev, ...accepted]
            })
            if (acceptedCount > 0) {
                showSuccessToast(t("legalDocuments.toast.added", { count: acceptedCount }))
            }
        },
        [t, validateFile]
    )

    const removeStagedFile = useCallback((id: string) => {
        setStagedFiles((prev) => prev.filter((staged) => staged.id !== id))
        setValidationError(null)
    }, [])

    const updateStagedLabel = useCallback((id: string, label: string) => {
        setStagedFiles((prev) =>
            prev.map((staged) => (staged.id === id ? { ...staged, label } : staged))
        )
    }, [])

    const clearStagedFiles = useCallback(() => {
        setStagedFiles([])
        setValidationError(null)
    }, [])

    const showUploadSuccess = useCallback(
        (uploaded: LegalDocument[], pendingId?: string | number) => {
            const count = uploaded.length
            const message = t("legalDocuments.toast.uploaded", { count })
            showUndoToast(
                message,
                {
                    undoLabel: t("legalDocuments.toast.undo", { count }),
                    onUndo: () => {
                        for (const doc of uploaded) deleteMutation.mutate(doc.id)
                        showSuccessToast(t("legalDocuments.toast.uploadUndone", { count }))
                    },
                },
                pendingId !== undefined ? { id: pendingId } : undefined
            )
        },
        [deleteMutation, t]
    )

    const retryFailedUpload = useCallback(
        (orgId: string, failed: StagedFile[]) => {
            const pendingId = showPendingToast(
                t("legalDocuments.toast.retrying", { count: failed.length })
            )
            void uploadAll(orgId, failed, updateStaged).then(
                ({ uploadedDocuments, failedStaged }) => {
                    const allSuccess = failedStaged.length === 0
                    const allFail = uploadedDocuments.length === 0
                    if (allSuccess) {
                        showUploadSuccess(uploadedDocuments, pendingId)
                    } else if (allFail) {
                        const count = failedStaged.length
                        showRetryErrorToast(
                            t("legalDocuments.toast.uploadFailed", { count }),
                            { onRetry: () => retryFailedUpload(orgId, failedStaged) },
                            { id: pendingId }
                        )
                    } else {
                        toast.dismiss(pendingId)
                        showUploadSuccess(uploadedDocuments)
                        const count = failedStaged.length
                        showRetryErrorToast(t("legalDocuments.toast.uploadFailed", { count }), {
                            onRetry: () => retryFailedUpload(orgId, failedStaged),
                        })
                    }
                    setStagedFiles((prev) => prev.filter((staged) => staged.status !== "uploaded"))
                }
            )
        },
        [uploadAll, updateStaged, showUploadSuccess, t]
    )

    const showUploadFailure = useCallback(
        (orgId: string, failed: StagedFile[], pendingId?: string | number) => {
            const count = failed.length
            const message = t("legalDocuments.toast.uploadFailed", { count })
            showRetryErrorToast(
                message,
                { onRetry: () => retryFailedUpload(orgId, failed) },
                pendingId !== undefined ? { id: pendingId } : undefined
            )
        },
        [retryFailedUpload, t]
    )

    const submitStagedFiles = useCallback(() => {
        if (!organizationId) {
            setValidationError(t("legalDocuments.error.noOrganization"))
            return
        }
        const toUpload = stagedFiles.filter(
            (staged) => staged.status === "queued" || staged.status === "error"
        )
        if (toUpload.length === 0) {
            setValidationError(t("legalDocuments.error.emptyUpload"))
            return
        }
        const hasInvalidLabel = toUpload.some(
            (staged) => !safeParseSchema(legalDocumentLabelSchema, staged.label).success
        )
        if (hasInvalidLabel) {
            setValidationError(t("legalDocuments.error.missingLabels"))
            return
        }
        const totalNewBytes = toUpload.reduce((acc, staged) => acc + staged.file.size, 0)
        if (totalSizeBytes + totalNewBytes > quotaBytes) {
            setValidationError(
                t("legalDocuments.error.quotaExceeded", {
                    size: Math.round(quotaBytes / (1024 * 1024)),
                })
            )
            return
        }
        setValidationError(null)

        const pendingId = showPendingToast(
            t("legalDocuments.toast.uploading", { count: toUpload.length })
        )

        void uploadAll(organizationId, toUpload, updateStaged).then(
            ({ uploadedDocuments, failedStaged }) => {
                const allSuccess = failedStaged.length === 0
                const allFail = uploadedDocuments.length === 0
                if (allSuccess) {
                    showUploadSuccess(uploadedDocuments, pendingId)
                } else if (allFail) {
                    showUploadFailure(organizationId, failedStaged, pendingId)
                } else {
                    toast.dismiss(pendingId)
                    showUploadSuccess(uploadedDocuments)
                    showUploadFailure(organizationId, failedStaged)
                }
                setStagedFiles((prev) => prev.filter((staged) => staged.status !== "uploaded"))
            }
        )
    }, [
        organizationId,
        stagedFiles,
        totalSizeBytes,
        quotaBytes,
        uploadAll,
        updateStaged,
        showUploadSuccess,
        showUploadFailure,
        t,
    ])

    const openRenameDialog = useCallback((doc: LegalDocument) => setRenameTarget(doc), [])
    const closeRenameDialog = useCallback(() => setRenameTarget(null), [])

    const confirmRename = useCallback(
        (label: string) => {
            if (!renameTarget) return
            const target = renameTarget
            setRenameTarget(null)
            const promise = renameMutation.mutateAsync({
                documentId: target.id,
                input: { label },
            })
            showPromiseToast(promise, {
                loading: t("legalDocuments.toast.renaming"),
                success: t("legalDocuments.toast.renamed"),
                error: (error) =>
                    error instanceof Error ? error.message : t("legalDocuments.toast.renameFailed"),
            })
            promise.catch(() => {})
        },
        [renameTarget, renameMutation, t]
    )

    const openDeleteDialog = useCallback((doc: LegalDocument) => setDeleteTarget(doc), [])
    const closeDeleteDialog = useCallback(() => setDeleteTarget(null), [])

    const confirmDelete = useCallback(() => {
        if (!deleteTarget) return
        const target = deleteTarget
        setDeleteTarget(null)
        const promise = deleteMutation.mutateAsync(target.id)
        showPromiseToast(promise, {
            loading: t("legalDocuments.toast.deleting"),
            success: t("legalDocuments.toast.deleted"),
            error: (error) =>
                error instanceof Error ? error.message : t("legalDocuments.toast.deleteFailed"),
        })
        promise.catch(() => {})
    }, [deleteTarget, deleteMutation, t])

    const download = useCallback(
        (doc: LegalDocument) => {
            if (!organizationId) return
            const promise = fetchLegalDocumentDownloadUrl(organizationId, doc.id).then(
                ({ url }) => {
                    const anchor = document.createElement("a")
                    anchor.href = url
                    anchor.download = doc.label
                    anchor.rel = "noopener noreferrer"
                    document.body.appendChild(anchor)
                    anchor.click()
                    document.body.removeChild(anchor)
                }
            )
            showPromiseToast(promise, {
                loading: t("legalDocuments.toast.preparingDownload"),
                success: t("legalDocuments.toast.downloadStarted"),
                error: (error) =>
                    error instanceof Error
                        ? error.message
                        : t("legalDocuments.toast.downloadFailed"),
            })
            promise.catch(() => {})
        },
        [organizationId, t]
    )

    const value = useMemo<LegalDocumentsContextValue>(
        () => ({
            state: {
                documents,
                stagedFiles,
                isLoading: listQuery.isLoading,
                isError: listQuery.isError,
                isUploading,
                isRenaming: renameMutation.isPending,
                isDeleting: deleteMutation.isPending,
                renameTarget,
                deleteTarget,
                validationError,
            },
            actions: {
                addStagedFiles,
                removeStagedFile,
                updateStagedLabel,
                submitStagedFiles,
                clearStagedFiles,
                setValidationError,
                openRenameDialog,
                closeRenameDialog,
                confirmRename,
                openDeleteDialog,
                closeDeleteDialog,
                confirmDelete,
                download,
            },
            meta: {
                totalSizeBytes,
                quotaBytes,
            },
        }),
        [
            documents,
            stagedFiles,
            listQuery.isLoading,
            listQuery.isError,
            isUploading,
            renameMutation.isPending,
            deleteMutation.isPending,
            renameTarget,
            deleteTarget,
            validationError,
            addStagedFiles,
            removeStagedFile,
            updateStagedLabel,
            submitStagedFiles,
            clearStagedFiles,
            openRenameDialog,
            closeRenameDialog,
            confirmRename,
            openDeleteDialog,
            closeDeleteDialog,
            confirmDelete,
            download,
            totalSizeBytes,
            quotaBytes,
        ]
    )

    return <LegalDocumentsContext value={value}>{children}</LegalDocumentsContext>
}
