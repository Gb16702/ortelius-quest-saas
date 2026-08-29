/**
 * Dedicated VoIP signaling channel (`/api/call`).
 *
 * Different from the lifecycle messages in `messages.ts` (those are
 * `call:request`, `call:response`, etc. on the SHARED `/api/ws`).
 * This channel carries the per-call WebRTC handshake (offer/answer/ICE) and
 * presence within a call (joined/left/mute).
 *
 * Per-call metrics moved to `POST /api/calls/:callId/metrics` — HTTP is
 * queueable + retryable and doesn't block on a live WS.
 *
 * Defined here so backend + frontend share a single source of truth — the
 * shapes used to drift between `call-ws.manager.ts` (server) and
 * `signaling.types.ts` (client) when changes happened on one side only.
 */

import { z } from 'zod'

// ============================================================================
// Discriminator
// ============================================================================

export const SignalingMessageTypeSchema = z.enum([
  'call:join',
  'call:leave',
  'call:ready',
  'webrtc:offer',
  'webrtc:answer',
  'webrtc:ice',
  'participant:mute',
  'participant:joined',
  'participant:left',
  'connection:established',
  'error',
])
export type SignalingMessageType = z.infer<typeof SignalingMessageTypeSchema>

// ============================================================================
// Per-message schemas
// ============================================================================

const Base = z.object({
  callId: z.string(),
  timestamp: z.string().optional(),
})

export const SignalingJoinMessageSchema = Base.extend({
  type: z.literal('call:join'),
  userId: z.string().optional(),
  userName: z.string().optional(),
})

export const SignalingLeaveMessageSchema = Base.extend({
  type: z.literal('call:leave'),
  userId: z.string().optional(),
  reason: z.string().optional(),
})

export const SignalingCallReadyMessageSchema = Base.extend({
  type: z.literal('call:ready'),
})

export const SignalingOfferMessageSchema = Base.extend({
  type: z.literal('webrtc:offer'),
  sdp: z.string(),
  from: z.string().optional(),
})

export const SignalingAnswerMessageSchema = Base.extend({
  type: z.literal('webrtc:answer'),
  sdp: z.string(),
  from: z.string().optional(),
})

export const SignalingIceMessageSchema = Base.extend({
  type: z.literal('webrtc:ice'),
  candidate: z.string(),
  sdpMid: z.string().nullable(),
  sdpMLineIndex: z.number().nullable(),
  from: z.string().optional(),
})

export const SignalingMuteMessageSchema = Base.extend({
  type: z.literal('participant:mute'),
  userId: z.string().optional(),
  isMuted: z.boolean(),
})

export const SignalingParticipantJoinedMessageSchema = Base.extend({
  type: z.literal('participant:joined'),
  userId: z.string(),
})

export const SignalingParticipantLeftMessageSchema = Base.extend({
  type: z.literal('participant:left'),
  userId: z.string(),
  reason: z.string().optional(),
})

// Metrics sample shape kept here as a shared type for the HTTPS endpoint
// `POST /api/calls/:callId/metrics`. The body is `{ samples: MetricsSample[] }`.
export const SignalingMetricsSampleSchema = z.object({
  timestamp: z.string(),
  metrics: z.object({
    audio: z.record(z.string(), z.unknown()).optional(),
    video: z.record(z.string(), z.unknown()).optional(),
    connection: z.record(z.string(), z.unknown()).optional(),
  }),
})

export const SignalingConnectionEstablishedMessageSchema = z.object({
  type: z.literal('connection:established'),
  userId: z.string(),
  timestamp: z.string(),
})

export const SignalingErrorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
})

// ============================================================================
// Discriminated union
// ============================================================================

export const SignalingMessageSchema = z.discriminatedUnion('type', [
  SignalingJoinMessageSchema,
  SignalingLeaveMessageSchema,
  SignalingCallReadyMessageSchema,
  SignalingOfferMessageSchema,
  SignalingAnswerMessageSchema,
  SignalingIceMessageSchema,
  SignalingMuteMessageSchema,
  SignalingParticipantJoinedMessageSchema,
  SignalingParticipantLeftMessageSchema,
  SignalingConnectionEstablishedMessageSchema,
  SignalingErrorMessageSchema,
])

// ============================================================================
// Inferred TS types
// ============================================================================

export type SignalingJoinMessage = z.infer<typeof SignalingJoinMessageSchema>
export type SignalingLeaveMessage = z.infer<typeof SignalingLeaveMessageSchema>
export type SignalingCallReadyMessage = z.infer<typeof SignalingCallReadyMessageSchema>
export type SignalingOfferMessage = z.infer<typeof SignalingOfferMessageSchema>
export type SignalingAnswerMessage = z.infer<typeof SignalingAnswerMessageSchema>
export type SignalingIceMessage = z.infer<typeof SignalingIceMessageSchema>
export type SignalingMuteMessage = z.infer<typeof SignalingMuteMessageSchema>
export type SignalingParticipantJoinedMessage = z.infer<
  typeof SignalingParticipantJoinedMessageSchema
>
export type SignalingParticipantLeftMessage = z.infer<typeof SignalingParticipantLeftMessageSchema>
export type SignalingMetricsSample = z.infer<typeof SignalingMetricsSampleSchema>
export type SignalingConnectionEstablishedMessage = z.infer<
  typeof SignalingConnectionEstablishedMessageSchema
>
export type SignalingErrorMessage = z.infer<typeof SignalingErrorMessageSchema>
export type SignalingMessage = z.infer<typeof SignalingMessageSchema>

// ============================================================================
// Distributed message envelope (Redis pub/sub between API pods)
// ============================================================================

export const DistributedCallMessageSchema = z.object({
  kind: z.enum(['send-to-user', 'broadcast-to-call']),
  targetUserId: z.string().optional(),
  callId: z.string().optional(),
  excludeUserId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  sourceInstanceId: z.string().optional(),
})
export type DistributedCallMessage = z.infer<typeof DistributedCallMessageSchema>
