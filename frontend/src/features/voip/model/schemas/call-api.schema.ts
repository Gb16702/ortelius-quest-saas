import * as v from "valibot"
import { httpUrlSchema } from "@/shared/lib/validation/url.schema"

export const callTypeSchema = v.picklist(["audio", "video"])
export const callRecordStatusSchema = v.picklist([
    "pending",
    "active",
    "ended",
    "rejected",
    "missed",
])

const nullableStringSchema = v.pipe(
    v.optional(v.nullable(v.string())),
    v.transform((value) => value ?? null)
)

export const callRecordSchema = v.pipe(
    v.looseObject({
        id: v.string(),
        conversationId: v.string(),
        callerId: v.string(),
        calleeId: nullableStringSchema,
        callType: callTypeSchema,
        status: callRecordStatusSchema,
        startedAt: v.string(),
        endedAt: nullableStringSchema,
        duration: nullableStringSchema,
        endedBy: nullableStringSchema,
        recordingUrl: nullableStringSchema,
        transcriptId: nullableStringSchema,
        metadata: v.nullable(v.record(v.string(), v.unknown())),
    }),
    v.transform((record) => ({
        ...record,
        calleeId: record.calleeId ?? null,
        endedAt: record.endedAt ?? null,
        duration: record.duration ?? null,
        endedBy: record.endedBy ?? null,
        recordingUrl: record.recordingUrl ?? null,
        transcriptId: record.transcriptId ?? null,
    }))
)

export const callHistoryItemSchema = callRecordSchema

export const callHistoryResponseSchema = v.looseObject({
    data: v.array(callHistoryItemSchema),
    pagination: v.looseObject({
        page: v.number(),
        limit: v.number(),
        total: v.number(),
        totalPages: v.number(),
    }),
})

export const recordingInitiateResponseSchema = v.looseObject({
    uploadId: v.string(),
    key: v.string(),
    parts: v.array(
        v.looseObject({
            partNumber: v.number(),
            url: httpUrlSchema,
        })
    ),
})

export const recordingCompleteResponseSchema = v.looseObject({
    recordingUrl: httpUrlSchema,
})

export const transcriptDownloadUrlResponseSchema = v.looseObject({
    downloadUrl: httpUrlSchema,
})

export const callTranscriptSchema = v.looseObject({
    callId: v.string(),
    text: v.string(),
    pdfUrl: v.pipe(
        v.nullish(httpUrlSchema),
        v.transform((value) => value ?? null)
    ),
    recordingUrl: v.pipe(
        v.nullish(httpUrlSchema),
        v.transform((value) => value ?? null)
    ),
    segments: v.optional(
        v.array(
            v.looseObject({
                speakerId: v.optional(v.string()),
                speakerName: v.optional(v.string()),
                text: v.string(),
                startTime: v.optional(v.number()),
                endTime: v.optional(v.number()),
            })
        )
    ),
})

export const callApiErrorResponseSchema = v.looseObject({
    success: v.optional(v.literal(false)),
    message: v.optional(v.string()),
})

export type CallRecord = v.InferOutput<typeof callRecordSchema>
export type RecordingInitiateResponse = v.InferOutput<typeof recordingInitiateResponseSchema>
export type RecordingCompleteResponse = v.InferOutput<typeof recordingCompleteResponseSchema>
