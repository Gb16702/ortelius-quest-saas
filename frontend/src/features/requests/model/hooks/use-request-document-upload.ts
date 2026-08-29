import { showErrorToast } from "@/shared/ui/toasts"
import { REQUEST_DOCUMENT_FILE_CONFIG } from "../../lib/request-document-upload.config"

interface FileValidationResult {
    validFiles: File[]
    invalidFiles: { file: File; reason: string }[]
}

interface UseRequestDocumentUploadProps {
    existingFiles: File[]
    onFilesUpdate: (files: File[]) => void
}

export function useRequestDocumentUpload({
    existingFiles,
    onFilesUpdate,
}: UseRequestDocumentUploadProps) {
    const uploadFiles = (files: File[]) => {
        if (files.length === 0) return

        const { validFiles, invalidFiles } = validatePdfFiles(files)

        if (validFiles.length > 0) {
            const countError = validateFileCount(existingFiles, validFiles)

            if (countError) {
                showErrorToast(countError)
                return
            }

            const allFiles = [...existingFiles, ...validFiles]
            onFilesUpdate(allFiles)
        }

        const message = getValidationErrorMessage(invalidFiles)

        if (message) {
            showErrorToast(message)
        }
    }

    const removeFile = (index: number) => {
        const newFiles = [...existingFiles]
        newFiles.splice(index, 1)
        onFilesUpdate(newFiles)
    }

    return {
        uploadFiles,
        removeFile,
    }
}

function validatePdfFiles(files: File[]): FileValidationResult {
    const invalidFiles: { file: File; reason: string }[] = []
    const validFiles: File[] = []

    for (const file of files) {
        const validationError = validateSinglePdfFile(file)

        if (validationError) {
            invalidFiles.push({ file, reason: validationError })
        } else {
            validFiles.push(file)
        }
    }

    return { validFiles, invalidFiles }
}

function validateSinglePdfFile(file: File): string | null {
    if (file.type !== "application/pdf") {
        return "Only PDF files are allowed"
    }

    const maxSize = REQUEST_DOCUMENT_FILE_CONFIG.maxSize
    if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024)
        return `File size exceeds ${maxSizeMB}MB limit`
    }

    return null
}

function validateFileCount(existingFiles: File[], newFiles: File[]): string | null {
    const allFiles = [...existingFiles, ...newFiles]
    const maxFiles = REQUEST_DOCUMENT_FILE_CONFIG.maxFiles

    if (allFiles.length > maxFiles) {
        return `Maximum ${maxFiles} files allowed. Please remove some files first.`
    }

    return null
}

function getValidationErrorMessage(invalidFiles: { file: File; reason: string }[]): string | null {
    if (invalidFiles.length === 0) return null

    return invalidFiles.length === 1
        ? `${invalidFiles[0].file.name}: ${invalidFiles[0].reason}`
        : `${invalidFiles.length} files rejected. Check file types and sizes.`
}
