import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    requestDocumentsUploadResponseSchema,
    type SendRequestPayload,
    sendRequestPayloadSchema,
    sendRequestResponseSchema,
} from "../model/schemas/send-request.schema"
import { getResponseErrorMessage, parseJsonResponse, readJsonResponse } from "./request.response"

function getUploadedDocumentUrls(payload: unknown): string[] {
    const result = safeParseSchema(requestDocumentsUploadResponseSchema, payload)

    if (!result.success) {
        throw new Error("Failed to upload documents: response did not include valid document URLs")
    }

    return result.data
}

export async function uploadRequestDocuments(files: File[]): Promise<string[]> {
    if (files.length === 0) return []

    const formData = new FormData()
    for (const [index, file] of files.entries()) {
        formData.append(`file${index}`, file)
    }

    const response = await fetch("/api/documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
    })

    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw new Error(getResponseErrorMessage(payload, "Failed to upload documents"))
    }

    return getUploadedDocumentUrls(payload)
}

export async function submitSendRequest(payload: SendRequestPayload): Promise<void> {
    const validatedPayload = parseSchema(sendRequestPayloadSchema, payload)

    const response = await fetch("/api/requests", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedPayload),
    })

    await parseJsonResponse(response, sendRequestResponseSchema, "Failed to submit request")
}
