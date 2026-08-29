import * as v from "valibot"
import { readJsonResponse } from "@/shared/api/http.response"
import { formatFileSize } from "@/shared/lib/file-size"
import { CONVERSATION_ATTACHMENT_FILE_CONFIG } from "@/shared/lib/file-upload/conversation-attachment-policy"
import { optionalHttpUrlSchema } from "@/shared/lib/validation/url.schema"

const uploadResponseSchema = v.looseObject({
    data: v.optional(
        v.looseObject({
            attachments: v.optional(v.array(v.unknown())),
            documents: v.optional(v.array(v.unknown())),
            urls: v.optional(v.array(v.unknown())),
        })
    ),
    documents: v.optional(v.array(v.unknown())),
    urls: v.optional(v.array(v.unknown())),
    message: v.optional(v.string()),
})

const uploadedChatAttachmentSchema = v.looseObject({
    id: v.string(),
    filename: v.string(),
    originalName: v.string(),
    size: v.number(),
    mimeType: v.string(),
    s3Key: v.string(),
    url: optionalHttpUrlSchema,
    downloadUrl: optionalHttpUrlSchema,
    uploadedAt: v.string(),
    uploadedBy: v.string(),
})

type UploadedChatAttachment = v.InferOutput<typeof uploadedChatAttachmentSchema>

function getUploadErrorMessage(payload: unknown, fallback: string): string {
    const result = v.safeParse(uploadResponseSchema, payload)
    if (!result.success) return fallback
    return result.output.message || fallback
}

function getUploadedDocuments(payload: unknown): unknown[] {
    const json = v.parse(uploadResponseSchema, payload)
    return (
        json.data?.attachments ||
        json.data?.documents ||
        json.data?.urls ||
        json.documents ||
        json.urls ||
        []
    )
}

async function uploadFiles(
    files: File[],
    endpoint: string
): Promise<{ success: boolean; documents?: unknown[]; error?: string; errorKey?: string }> {
    try {
        const formData = new FormData()
        for (const [index, file] of files.entries()) {
            formData.append(`file${index}`, file)
        }

        const res = await fetch(endpoint, {
            method: "POST",
            credentials: "include",
            body: formData,
        })

        const json = await readJsonResponse(res)
        if (!res.ok) throw new Error(getUploadErrorMessage(json, "Upload failed"))

        return {
            success: true,
            documents: getUploadedDocuments(json),
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Upload failed",
            errorKey: "uploadFailed",
        }
    }
}

export async function uploadChatAttachments(
    files: File[],
    conversationId: string
): Promise<{
    success: boolean
    attachments?: UploadedChatAttachment[]
    error?: string
    errorKey?: string
    errorParams?: Record<string, unknown>
}> {
    const acceptedMimeTypes: readonly string[] =
        CONVERSATION_ATTACHMENT_FILE_CONFIG.acceptedMimeTypes
    const invalidFiles = files.filter((file) => !acceptedMimeTypes.includes(file.type))

    if (invalidFiles.length > 0) {
        return {
            success: false,
            errorKey: "invalidFileType",
            errorParams: {
                formats: CONVERSATION_ATTACHMENT_FILE_CONFIG.acceptedFormats.join(", "),
            },
        }
    }

    if (files.length > CONVERSATION_ATTACHMENT_FILE_CONFIG.maxFiles) {
        return {
            success: false,
            errorKey: "maxFiles",
            errorParams: { count: CONVERSATION_ATTACHMENT_FILE_CONFIG.maxFiles },
        }
    }

    for (const file of files) {
        if (file.size > CONVERSATION_ATTACHMENT_FILE_CONFIG.maxSize) {
            return {
                success: false,
                errorKey: "fileTooLarge",
                errorParams: {
                    filename: file.name,
                    size: formatFileSize(CONVERSATION_ATTACHMENT_FILE_CONFIG.maxSize),
                },
            }
        }
    }

    const result = await uploadFiles(files, `/api/messages/${conversationId}/attachments`)

    if (!result.success) {
        return {
            success: false,
            error: result.error,
            errorKey: result.errorKey,
        }
    }

    return {
        success: true,
        attachments: v.parse(v.array(uploadedChatAttachmentSchema), result.documents ?? []),
    }
}
