import { createApiError, parseJsonResponse, readJsonResponse } from "@/shared/api/http.response"
import { formatFileSize } from "@/shared/lib/file-size"
import { CONVERSATION_ATTACHMENT_FILE_CONFIG } from "@/shared/lib/file-upload/conversation-attachment-policy"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type { AssistantAttachment } from "../model/quest-assistant"
import {
    assistantAttachmentListResponseSchema,
    assistantAttachmentUploadResponseSchema,
    assistantRecentAttachmentResponseSchema,
} from "../model/quest-assistant.schema"

interface UploadAssistantAttachmentsInput {
    files: File[]
    organizationId?: string
}

interface ListAssistantAttachmentsInput {
    limit: number
    cursor?: string | null
    search?: string
}

interface ListAssistantAttachmentsResult {
    attachments: AssistantAttachment[]
    nextCursor: string | null
    hasMore: boolean
}

interface AssistantImageDimensions {
    width: number
    height: number
}

export function validateAssistantAttachmentFiles(input: {
    files: File[]
    selectedCount: number
}): string | null {
    const nextCount = input.selectedCount + input.files.length

    if (nextCount > CONVERSATION_ATTACHMENT_FILE_CONFIG.maxFiles) {
        return `You can attach up to ${CONVERSATION_ATTACHMENT_FILE_CONFIG.maxFiles} files.`
    }

    const acceptedMimeTypes: readonly string[] =
        CONVERSATION_ATTACHMENT_FILE_CONFIG.acceptedMimeTypes
    const invalidFile = input.files.find((file) => !acceptedMimeTypes.includes(file.type))
    if (invalidFile) {
        return `Unsupported file type. Use ${CONVERSATION_ATTACHMENT_FILE_CONFIG.acceptedFormats.join(", ")}.`
    }

    const oversizedFile = input.files.find(
        (file) => file.size > CONVERSATION_ATTACHMENT_FILE_CONFIG.maxSize
    )
    if (oversizedFile) {
        return `${oversizedFile.name} must be ${formatFileSize(CONVERSATION_ATTACHMENT_FILE_CONFIG.maxSize)} or smaller.`
    }

    return null
}

export async function uploadAssistantAttachments({
    files,
    organizationId,
}: UploadAssistantAttachmentsInput): Promise<AssistantAttachment[]> {
    const formData = new FormData()
    const imageDimensionsPromise = Promise.all(files.map(readAssistantImageFileDimensions))

    for (const [index, file] of files.entries()) {
        formData.append(`file${index}`, file)
    }

    if (organizationId) {
        formData.append("organizationId", organizationId)
    }

    const response = await fetch("/api/assistant/attachments", {
        method: "POST",
        credentials: "include",
        body: formData,
    })
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw createApiError(response.status, payload, "Failed to upload assistant attachments")
    }

    const parsed = safeParseSchema(assistantAttachmentUploadResponseSchema, payload)
    if (!parsed.success) {
        throw new Error("Assistant attachment upload response is invalid")
    }

    const imageDimensions = await imageDimensionsPromise

    return parsed.data.data.attachments.map((attachment, index) => {
        const dimensions = imageDimensions[index]
        if (!dimensions) return attachment

        return {
            ...attachment,
            width: attachment.width ?? dimensions.width,
            height: attachment.height ?? dimensions.height,
        }
    })
}

export async function fetchRecentAssistantAttachments(limit = 3): Promise<AssistantAttachment[]> {
    const searchParams = new URLSearchParams({ limit: String(limit) })
    const response = await fetch(`/api/assistant/attachments/recent?${searchParams}`, {
        credentials: "include",
    })
    const payload = await parseJsonResponse(
        response,
        assistantRecentAttachmentResponseSchema,
        "Failed to load recent assistant attachments"
    )

    return payload.data.attachments
}

export async function fetchAssistantAttachments({
    limit,
    cursor,
    search,
}: ListAssistantAttachmentsInput): Promise<ListAssistantAttachmentsResult> {
    const searchParams = new URLSearchParams({ limit: String(limit) })

    if (cursor) {
        searchParams.set("cursor", cursor)
    }

    if (search?.trim()) {
        searchParams.set("search", search.trim())
    }

    const response = await fetch(`/api/assistant/attachments?${searchParams}`, {
        credentials: "include",
    })
    const payload = await parseJsonResponse(
        response,
        assistantAttachmentListResponseSchema,
        "Failed to load assistant attachments"
    )

    return {
        attachments: payload.data.attachments,
        nextCursor: payload.data.pagination.nextCursor,
        hasMore: payload.data.pagination.hasMore,
    }
}

function readAssistantImageFileDimensions(file: File): Promise<AssistantImageDimensions | null> {
    if (
        !file.type.startsWith("image/") ||
        typeof Image === "undefined" ||
        typeof URL === "undefined"
    ) {
        return Promise.resolve(null)
    }

    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file)
        const image = new Image()

        image.onload = () => {
            URL.revokeObjectURL(objectUrl)
            if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
                resolve(null)
                return
            }

            resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
            })
        }
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            resolve(null)
        }
        image.src = objectUrl
    })
}
