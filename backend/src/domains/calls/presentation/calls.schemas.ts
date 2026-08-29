import { z } from 'zod'

export const callIdParamSchema = z.object({
  callId: z.string().min(1, 'Call ID is required'),
})

export const conversationIdParamSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
})

export const transcriptIdParamSchema = z.object({
  transcriptId: z.string().min(1, 'Transcript ID is required'),
})

export const jobIdParamSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
})

export const callParticipantSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  userName: z.string().min(1, 'User name is required'),
  joinedAt: z.date(),
})

export const startCallSchema = z.object({
  callId: z.string().min(1, 'Call ID is required'),
  conversationId: z.string().min(1, 'Conversation ID is required'),
  participants: z.array(callParticipantSchema).min(1, 'At least one participant is required'),
})

export const addParticipantSchema = z.object({
  participant: callParticipantSchema,
})

export const removeParticipantSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export const transcriptionJobSchema = z.object({
  id: z.string().min(1, 'Job ID is required'),
  audioKey: z.string().min(1, 'Audio key is required'),
  callId: z.string().min(1, 'Call ID is required'),
  conversationId: z.string().min(1, 'Conversation ID is required'),
  speakerInfo: z
    .object({
      userId: z.string().min(1, 'User ID is required'),
      userName: z.string().min(1, 'User name is required'),
    })
    .optional(),
  options: z
    .object({
      prompt: z.string().optional(),
    })
    .optional(),
})

export const transcriptionOptionsSchema = z.object({
  model: z.enum(['whisper-1']).optional(),
  prompt: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
})

export const speakerInfoSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  userName: z.string().min(1, 'User name is required'),
})

export const transcribeAudioSchema = z.object({
  audioKey: z.string().min(1, 'Audio key is required'),
  callId: z.string().min(1, 'Call ID is required'),
  conversationId: z.string().min(1, 'Conversation ID is required'),
  options: transcriptionOptionsSchema.optional(),
  speakerInfo: speakerInfoSchema.optional(),
})

export const generateSummarySchema = z.object({
  callId: z.string().min(1, 'Call ID is required'),
  conversationId: z.string().min(1, 'Conversation ID is required'),
})

export const initiateCallSchema = z.object({
  conversationId: z.string().uuid(),
  // Nullable for org calls (no specific callee — whichever org member picks
  // up becomes the callee at accept time). The frontend sends `null` for
  // these. Without `.nullable()` zod returned 400, the frontend fell back
  // to a non-UUID local call ID, and every downstream WS query crashed.
  calleeId: z.string().min(1).nullable().optional(),
  callType: z.enum(['audio', 'video']),
})

export const updateCallStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'ended', 'missed']),
})

export const callHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'active', 'ended', 'rejected', 'missed']).optional(),
})

export const initiateRecordingUploadSchema = z.object({
  speakerId: z.string().min(1),
  estimatedParts: z.number().int().min(1).max(10000),
  contentType: z.string().default('audio/webm'),
})

export const completeRecordingUploadSchema = z.object({
  uploadId: z.string().min(1),
  key: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1),
        etag: z.string().min(1),
      })
    )
    .min(1),
})

export const abortRecordingUploadSchema = z.object({
  uploadId: z.string().min(1),
  key: z.string().min(1),
})

export type InitiateCallInputBody = z.infer<typeof initiateCallSchema>
export type UpdateCallStatusInputBody = z.infer<typeof updateCallStatusSchema>
export type CallHistoryQueryInput = z.infer<typeof callHistoryQuerySchema>
export type InitiateRecordingUploadInput = z.infer<typeof initiateRecordingUploadSchema>
export type CompleteRecordingUploadInput = z.infer<typeof completeRecordingUploadSchema>

export type CallIdParam = z.infer<typeof callIdParamSchema>
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>
export type TranscriptIdParam = z.infer<typeof transcriptIdParamSchema>
export type JobIdParam = z.infer<typeof jobIdParamSchema>
export type CallParticipantInput = z.infer<typeof callParticipantSchema>
export type StartCallInput = z.infer<typeof startCallSchema>
export type AddParticipantInput = z.infer<typeof addParticipantSchema>
export type RemoveParticipantInput = z.infer<typeof removeParticipantSchema>
export type TranscriptionJobInput = z.infer<typeof transcriptionJobSchema>
export type TranscriptionOptionsInput = z.infer<typeof transcriptionOptionsSchema>
export type SpeakerInfoInput = z.infer<typeof speakerInfoSchema>
export type TranscribeAudioInput = z.infer<typeof transcribeAudioSchema>
export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>

export const metricsBatchSchema = z.object({
  samples: z
    .array(
      z.object({
        timestamp: z.string(),
        metrics: z.object({
          audio: z.record(z.string(), z.unknown()).optional(),
          video: z.record(z.string(), z.unknown()).optional(),
          connection: z.record(z.string(), z.unknown()).optional(),
        }),
      })
    )
    .min(1, 'At least one sample is required')
    .max(500, 'Batch too large'),
})

export type MetricsBatchInput = z.infer<typeof metricsBatchSchema>
