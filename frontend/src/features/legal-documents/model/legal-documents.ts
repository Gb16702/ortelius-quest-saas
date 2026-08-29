import type { LegalDocument } from "@/entities/legal-document"

export type { LegalDocument } from "@/entities/legal-document"

export type StagedFileStatus = "queued" | "uploading" | "uploaded" | "error"

export interface StagedFile {
    id: string
    file: File
    label: string
    progress: number
    status: StagedFileStatus
    errorMessage: string | null
}

export interface LegalDocumentsListMeta {
    totalSizeBytes: number
    quotaBytes: number
}

export interface LegalDocumentsState {
    documents: LegalDocument[]
    stagedFiles: StagedFile[]
    isLoading: boolean
    isError: boolean
    isUploading: boolean
    isRenaming: boolean
    isDeleting: boolean
    renameTarget: LegalDocument | null
    deleteTarget: LegalDocument | null
    validationError: string | null
}

export interface LegalDocumentsActions {
    addStagedFiles: (files: File[]) => void
    removeStagedFile: (id: string) => void
    updateStagedLabel: (id: string, label: string) => void
    submitStagedFiles: () => void
    clearStagedFiles: () => void
    setValidationError: (message: string | null) => void
    openRenameDialog: (doc: LegalDocument) => void
    closeRenameDialog: () => void
    confirmRename: (label: string) => void
    openDeleteDialog: (doc: LegalDocument) => void
    closeDeleteDialog: () => void
    confirmDelete: () => void
    download: (doc: LegalDocument) => void
}

export interface LegalDocumentsContextValue {
    state: LegalDocumentsState
    actions: LegalDocumentsActions
    meta: LegalDocumentsListMeta
}
