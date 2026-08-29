import * as v from "valibot"

// ============================================================================
// Discriminator
// ============================================================================

export const SignalingMessageTypeSchema = v.picklist([
    "call:join",
    "call:leave",
    "call:ready",
    "webrtc:offer",
    "webrtc:answer",
    "webrtc:ice",
    "participant:mute",
    "participant:joined",
    "participant:left",
    "connection:established",
    "error",
])
export type SignalingMessageType = v.InferOutput<typeof SignalingMessageTypeSchema>

// ============================================================================
// Per-message schemas
// ============================================================================

const Base = v.object({
    callId: v.string(),
    timestamp: v.optional(v.string()),
})

export const SignalingJoinMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if Base has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    Base.entries,

    type: v.literal("call:join"),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
})

export const SignalingLeaveMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if Base has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    Base.entries,

    type: v.literal("call:leave"),
    userId: v.optional(v.string()),
    reason: v.optional(v.string()),
})

export const SignalingCallReadyMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if Base has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    Base.entries,

    type: v.literal("call:ready"),
})

export const SignalingOfferMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if Base has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    Base.entries,

    type: v.literal("webrtc:offer"),
    sdp: v.string(),
    from: v.optional(v.string()),
})

export const SignalingAnswerMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if Base has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    Base.entries,

    type: v.literal("webrtc:answer"),
    sdp: v.string(),
    from: v.optional(v.string()),
})

export const SignalingIceMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if Base has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    Base.entries,

    type: v.literal("webrtc:ice"),
    candidate: v.string(),
    sdpMid: v.nullable(v.string()),
    sdpMLineIndex: v.nullable(v.number()),
    from: v.optional(v.string()),
})

export const SignalingMuteMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if Base has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    Base.entries,

    type: v.literal("participant:mute"),
    userId: v.optional(v.string()),
    isMuted: v.boolean(),
})

export const SignalingParticipantJoinedMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if Base has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    Base.entries,

    type: v.literal("participant:joined"),
    userId: v.string(),
})

export const SignalingParticipantLeftMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if Base has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    Base.entries,

    type: v.literal("participant:left"),
    userId: v.string(),
    reason: v.optional(v.string()),
})

// Metrics sample shape kept here as a shared type for the HTTPS endpoint
// `POST /api/calls/:callId/metrics`. The body is `{ samples: MetricsSample[] }`.
export const SignalingMetricsSampleSchema = v.object({
    timestamp: v.string(),
    metrics: v.object({
        audio: v.optional(v.record(v.string(), v.unknown())),
        video: v.optional(v.record(v.string(), v.unknown())),
        connection: v.optional(v.record(v.string(), v.unknown())),
    }),
})

export const SignalingConnectionEstablishedMessageSchema = v.object({
    type: v.literal("connection:established"),
    userId: v.string(),
    timestamp: v.string(),
})

export const SignalingErrorMessageSchema = v.object({
    type: v.literal("error"),
    message: v.string(),
})

// ============================================================================
// Discriminated union
// ============================================================================

export const SignalingMessageSchema = v.variant("type", [
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

export type SignalingJoinMessage = v.InferOutput<typeof SignalingJoinMessageSchema>
export type SignalingLeaveMessage = v.InferOutput<typeof SignalingLeaveMessageSchema>
export type SignalingCallReadyMessage = v.InferOutput<typeof SignalingCallReadyMessageSchema>
export type SignalingOfferMessage = v.InferOutput<typeof SignalingOfferMessageSchema>
export type SignalingAnswerMessage = v.InferOutput<typeof SignalingAnswerMessageSchema>
export type SignalingIceMessage = v.InferOutput<typeof SignalingIceMessageSchema>
export type SignalingMuteMessage = v.InferOutput<typeof SignalingMuteMessageSchema>
export type SignalingParticipantJoinedMessage = v.InferOutput<
    typeof SignalingParticipantJoinedMessageSchema
>
export type SignalingParticipantLeftMessage = v.InferOutput<
    typeof SignalingParticipantLeftMessageSchema
>
export type SignalingMetricsSample = v.InferOutput<typeof SignalingMetricsSampleSchema>
export type SignalingConnectionEstablishedMessage = v.InferOutput<
    typeof SignalingConnectionEstablishedMessageSchema
>
export type SignalingErrorMessage = v.InferOutput<typeof SignalingErrorMessageSchema>
export type SignalingMessage = v.InferOutput<typeof SignalingMessageSchema>

// ============================================================================
// Distributed message envelope (Redis pub/sub between API pods)
// ============================================================================

export const DistributedCallMessageSchema = v.object({
    kind: v.picklist(["send-to-user", "broadcast-to-call"]),
    targetUserId: v.optional(v.string()),
    callId: v.optional(v.string()),
    excludeUserId: v.optional(v.string()),
    payload: v.record(v.string(), v.unknown()),
    sourceInstanceId: v.optional(v.string()),
})
export type DistributedCallMessage = v.InferOutput<typeof DistributedCallMessageSchema>
