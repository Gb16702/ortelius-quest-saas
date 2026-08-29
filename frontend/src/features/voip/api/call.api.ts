import * as v from "valibot"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type { CallHistoryQuery, CallHistoryResponse, CallTranscript, CallType } from "../model/call"
import {
    callApiErrorResponseSchema,
    callHistoryResponseSchema,
    callRecordSchema,
    callTranscriptSchema,
    recordingCompleteResponseSchema,
    recordingInitiateResponseSchema,
    transcriptDownloadUrlResponseSchema,
} from "../model/schemas/call-api.schema"

const API_BASE = "/api/calls"

function getCallApiErrorMessage(payload: unknown, fallback: string): string {
    const result = safeParseSchema(callApiErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.data.message || fallback
}

function unwrapEnvelope<T>(payload: unknown, schema: v.GenericSchema<unknown, T>): T {
    const envelope = v.safeParse(
        v.looseObject({
            success: v.literal(true),
            data: schema,
        }),
        payload
    )

    if (envelope.success) return envelope.output.data

    return parseSchema(schema, payload)
}

async function unwrap<T>(
    response: Response,
    schema: v.GenericSchema<unknown, T>,
    fallback = "Request failed"
): Promise<T> {
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        const error = new Error(
            getCallApiErrorMessage(payload, `HTTP ${response.status} ${response.statusText}`)
        )
        ;(error as Error & { status: number }).status = response.status
        throw error
    }

    const errorResult = safeParseSchema(callApiErrorResponseSchema, payload)
    if (errorResult.success && errorResult.data.success === false) {
        throw new Error(getCallApiErrorMessage(payload, fallback))
    }

    return unwrapEnvelope(payload, schema)
}

export type InitiateCallRequest = {
    conversationId: string
    calleeId?: string | null
    callType: CallType
}

export type CallRecord = v.InferOutput<typeof callRecordSchema>

export type UpdateCallStatus = "accepted" | "rejected" | "ended" | "missed"

export type RecordingInitiateResponse = v.InferOutput<typeof recordingInitiateResponseSchema>

export type RecordingCompleteResponse = v.InferOutput<typeof recordingCompleteResponseSchema>

export const CALL_API = {
    async initiateCall(request: InitiateCallRequest): Promise<CallRecord> {
        const response = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(request),
        })
        return unwrap(response, callRecordSchema, "Failed to initiate call")
    },

    async getCall(callId: string): Promise<CallRecord> {
        const response = await fetch(`${API_BASE}/${callId}`, { credentials: "include" })
        return unwrap(response, callRecordSchema, "Failed to fetch call")
    },

    async getActiveCalls(): Promise<CallRecord[]> {
        const response = await fetch(`${API_BASE}/active`, { credentials: "include" })
        return unwrap(response, v.array(callRecordSchema), "Failed to fetch active calls")
    },

    async updateCallStatus(callId: string, status: UpdateCallStatus): Promise<CallRecord> {
        const response = await fetch(`${API_BASE}/${callId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status }),
        })
        return unwrap(response, callRecordSchema, "Failed to update call")
    },

    acceptCall(callId: string): Promise<CallRecord> {
        return this.updateCallStatus(callId, "accepted")
    },

    rejectCall(callId: string): Promise<CallRecord> {
        return this.updateCallStatus(callId, "rejected")
    },

    endCall(callId: string): Promise<CallRecord> {
        return this.updateCallStatus(callId, "ended")
    },

    markMissed(callId: string): Promise<CallRecord> {
        return this.updateCallStatus(callId, "missed")
    },

    async getCallHistory(query: CallHistoryQuery = {}): Promise<CallHistoryResponse> {
        const params = new URLSearchParams()
        if (query.page !== undefined) params.set("page", String(query.page))
        if (query.limit !== undefined) params.set("limit", String(query.limit))
        if (query.status) params.set("status", query.status)

        const url = params.toString() ? `${API_BASE}/history?${params}` : `${API_BASE}/history`
        const response = await fetch(url, { credentials: "include" })
        return unwrap(response, callHistoryResponseSchema, "Failed to fetch call history")
    },

    async initiateRecordingUpload(
        callId: string,
        body: { speakerId: string; estimatedParts: number; contentType?: string }
    ): Promise<RecordingInitiateResponse> {
        const response = await fetch(`${API_BASE}/${callId}/recording/initiate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
        })
        return unwrap(
            response,
            recordingInitiateResponseSchema,
            "Failed to initiate recording upload"
        )
    },

    async completeRecordingUpload(
        callId: string,
        body: {
            uploadId: string
            key: string
            parts: Array<{ partNumber: number; etag: string }>
        }
    ): Promise<RecordingCompleteResponse> {
        const response = await fetch(`${API_BASE}/${callId}/recording/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
        })
        return unwrap(
            response,
            recordingCompleteResponseSchema,
            "Failed to complete recording upload"
        )
    },

    async abortRecordingUpload(
        callId: string,
        body: { uploadId: string; key: string }
    ): Promise<void> {
        const response = await fetch(`${API_BASE}/${callId}/recording/abort`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
        })
        const payload = await readJsonResponse(response)
        if (!response.ok) {
            throw new Error(getCallApiErrorMessage(payload, "Failed to abort recording upload"))
        }
    },

    async getTranscriptDownloadUrl(callId: string): Promise<{ downloadUrl: string }> {
        const response = await fetch(`${API_BASE}/${callId}/transcript/download`, {
            credentials: "include",
        })
        return unwrap(
            response,
            transcriptDownloadUrlResponseSchema,
            "Failed to fetch transcript download URL"
        )
    },

    async getCallTranscript(callId: string): Promise<CallTranscript | null> {
        const response = await fetch(`${API_BASE}/transcripts/call/${callId}`, {
            credentials: "include",
        })
        if (response.status === 404) return null
        return unwrap(response, callTranscriptSchema, "Failed to fetch call transcript")
    },
}

export type CallApiService = typeof CALL_API
