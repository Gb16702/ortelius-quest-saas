import * as v from "valibot"

/**
 * Message version for protocol evolution
 */
export const MESSAGE_VERSION = "1.0.0"

/**
 * Base schema for all WebSocket messages
 */
export const BaseMessageSchema = v.object({
    type: v.string(),
    timestamp: v.pipe(v.string(), v.isoTimestamp()),
    version: v.optional(v.string()),
})

export type BaseMessage = v.InferOutput<typeof BaseMessageSchema>

const OptionalRecordSchema = v.pipe(
    v.optional(v.nullable(v.record(v.string(), v.unknown()))),
    v.transform((value) => value ?? undefined)
)

// ============================================================================
// Connection & Health Messages
// ============================================================================

export const ConnectionEstablishedMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("connection:established"),
    userId: v.string(),
})

export const ServerPingMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("connection:ping"),
})

export const PongMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("connection:pong"),
})

export const ServerShutdownMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("connection:shutdown"),
})

export type ConnectionEstablishedMessage = v.InferOutput<typeof ConnectionEstablishedMessageSchema>
export type ServerPingMessage = v.InferOutput<typeof ServerPingMessageSchema>
export type PongMessage = v.InferOutput<typeof PongMessageSchema>
export type ServerShutdownMessage = v.InferOutput<typeof ServerShutdownMessageSchema>

// ============================================================================
// Chat & Messaging
// ============================================================================

export const TypingMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("chat:typing"),
    conversationId: v.string(),
    isTyping: v.boolean(),
    userId: v.optional(v.string()),
    userName: v.optional(v.nullable(v.string())),
    userImage: v.optional(v.nullable(v.string())),
})

export const NewMessageDataSchema = v.object({
    id: v.string(),
    content: v.string(),
    senderId: v.string(),
    createdAt: v.pipe(v.string(), v.isoTimestamp()),
    updatedAt: v.pipe(v.string(), v.isoTimestamp()),
    metadata: OptionalRecordSchema,
    // Server-enriched fields populated by message.services before broadcast.
    // Optional because the canonical shape is id/content/senderId/timestamps;
    // the rest is convenience info the UI renders directly.
    conversationId: v.optional(v.string()),
    messageType: v.optional(v.string()),
    replyToId: v.optional(v.nullable(v.string())),
    replyTo: v.optional(v.unknown()),
    senderName: v.optional(v.string()),
    senderImage: v.optional(v.nullable(v.string())),
    organizationName: v.optional(v.nullable(v.string())),
    memberRole: v.optional(v.nullable(v.string())),
})

export const NewMessageMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("message:new"),
    conversationId: v.string(),
    data: NewMessageDataSchema,
})

export const MessageEditedDataSchema = v.object({
    id: v.string(),
    content: v.string(),
    isEdited: v.boolean(),
    updatedAt: v.pipe(v.string(), v.isoTimestamp()),
})

export const MessageEditedMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("message:edited"),
    conversationId: v.string(),
    data: MessageEditedDataSchema,
})

export const MessageDeletedMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("message:deleted"),
    conversationId: v.string(),
    messageId: v.string(),
})

export const SystemMessageDataSchema = v.objectWithRest(
    {
        id: v.string(),
        content: v.string(),
        senderId: v.string(),
        metadata: OptionalRecordSchema,
        createdAt: v.pipe(v.string(), v.isoTimestamp()),
        updatedAt: v.pipe(v.string(), v.isoTimestamp()),
    },
    v.unknown()
)

export const SystemMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("system_message"),
    conversationId: v.string(),
    data: SystemMessageDataSchema,
})

export const MessageReadReaderInfoSchema = v.object({
    userId: v.string(),
    userName: v.nullable(v.string()),
    userImage: v.nullable(v.string()),
})

export const MessageReadDataSchema = v.object({
    messageId: v.string(),
    readBy: v.string(),
    conversationId: v.string(),
    readerInfo: v.optional(v.nullable(MessageReadReaderInfoSchema)),
})

export const MessageReadMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("message_read"),
    data: MessageReadDataSchema,
})

export type TypingMessage = v.InferOutput<typeof TypingMessageSchema>
export type NewMessageData = v.InferOutput<typeof NewMessageDataSchema>
export type NewMessageMessage = v.InferOutput<typeof NewMessageMessageSchema>
export type MessageEditedData = v.InferOutput<typeof MessageEditedDataSchema>
export type MessageEditedMessage = v.InferOutput<typeof MessageEditedMessageSchema>
export type MessageDeletedMessage = v.InferOutput<typeof MessageDeletedMessageSchema>
export type SystemMessageData = v.InferOutput<typeof SystemMessageDataSchema>
export type SystemMessage = v.InferOutput<typeof SystemMessageSchema>
export type MessageReadReaderInfo = v.InferOutput<typeof MessageReadReaderInfoSchema>
export type MessageReadData = v.InferOutput<typeof MessageReadDataSchema>
export type MessageReadMessage = v.InferOutput<typeof MessageReadMessageSchema>

// ============================================================================
// Notifications
// ============================================================================
// notifications:subscribe / notifications:subscribed removed — clients are
// auto-subscribed on WS connect (see realtime.services.ts handleConnection).

export const NotificationMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("notification:new"),
    notificationId: v.string(),
    notificationType: v.picklist(["message", "conversation_update", "request_update", "system"]),
    title: v.optional(v.string()),
    message: v.string(),
    data: OptionalRecordSchema,
    createdAt: v.pipe(v.string(), v.isoTimestamp()),
    isRead: v.boolean(),
    isArchived: v.boolean(),
})

export type NotificationMessage = v.InferOutput<typeof NotificationMessageSchema>

// ============================================================================
// Status Updates
// ============================================================================
// status:update (incoming) replaced by PATCH /api/users/me/status. The server
// still pushes status:updated to the user's other tabs/devices.

export const StatusUpdatedMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("status:updated"),
    status: v.string(),
})

export type StatusUpdatedMessage = v.InferOutput<typeof StatusUpdatedMessageSchema>

// ============================================================================
// Presence Updates
// ============================================================================

export const PresenceStatusSchema = v.picklist(["online", "offline"])

export const UserPresenceInfoSchema = v.object({
    userId: v.string(),
    status: PresenceStatusSchema,
    lastActiveAt: v.string(),
})

export const PresenceBatchMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("presence:batch"),
    users: v.array(UserPresenceInfoSchema),
})

export const PresenceUpdateMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("presence:update"),
    userId: v.string(),
    status: PresenceStatusSchema,
    lastActiveAt: v.string(),
})

export const SubscribePresenceMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("presence:subscribe"),
    userIds: v.array(v.string()),
})

export const UnsubscribePresenceMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("presence:unsubscribe"),
    userIds: v.array(v.string()),
})

export type PresenceStatus = v.InferOutput<typeof PresenceStatusSchema>
export type UserPresenceInfo = v.InferOutput<typeof UserPresenceInfoSchema>
export type PresenceBatchMessage = v.InferOutput<typeof PresenceBatchMessageSchema>
export type PresenceUpdateMessage = v.InferOutput<typeof PresenceUpdateMessageSchema>
export type SubscribePresenceMessage = v.InferOutput<typeof SubscribePresenceMessageSchema>
export type UnsubscribePresenceMessage = v.InferOutput<typeof UnsubscribePresenceMessageSchema>

// ============================================================================
// Organization Updates
// ============================================================================

export const OrganizationUpdatedDataSchema = v.object({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    logo: v.nullable(v.string()),
    brandLogo: v.optional(v.nullable(v.string())),
    tagline: v.optional(v.nullable(v.string())),
    brandColor: v.optional(v.string()),
    font: v.optional(v.string()),
})

export const OrganizationUpdatedMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("organization:updated"),
    organization: OrganizationUpdatedDataSchema,
    previousSlug: v.optional(v.nullable(v.string())),
})

export type OrganizationUpdatedData = v.InferOutput<typeof OrganizationUpdatedDataSchema>
export type OrganizationUpdatedMessage = v.InferOutput<typeof OrganizationUpdatedMessageSchema>

// ============================================================================
// Conversation Participants
// ============================================================================

export const ConversationParticipantInfoSchema = v.object({
    userId: v.string(),
    name: v.string(),
    image: v.optional(v.nullable(v.string())),
})

export const ConversationParticipantsMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("conversation:participants"),
    conversationId: v.string(),
    participants: v.array(ConversationParticipantInfoSchema),
})

export const SetActiveConversationMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("conversation:set_active"),
    conversationId: v.nullable(v.string()),
})

export type ConversationParticipantInfo = v.InferOutput<typeof ConversationParticipantInfoSchema>
export type ConversationParticipantsMessage = v.InferOutput<
    typeof ConversationParticipantsMessageSchema
>
export type SetActiveConversationMessage = v.InferOutput<typeof SetActiveConversationMessageSchema>

// ============================================================================
// Quest Assistant Realtime Events
// ============================================================================

export const AssistantActionStatusSchema = v.picklist([
    "proposed",
    "executed",
    "cancelled",
    "expired",
    "failed",
])
export const AssistantActionRiskLevelSchema = v.picklist(["low", "medium", "high", "destructive"])

export const AssistantRealtimeActionSchema = v.object({
    id: v.string(),
    conversationId: v.nullable(v.string()),
    userId: v.string(),
    organizationId: v.nullable(v.string()),
    type: v.picklist(["open_page"]),
    status: AssistantActionStatusSchema,
    title: v.string(),
    summary: v.string(),
    buttonLabel: v.string(),
    riskLevel: AssistantActionRiskLevelSchema,
    requiresConfirmation: v.boolean(),
    payload: v.record(v.string(), v.unknown()),
    preview: v.nullable(v.record(v.string(), v.unknown())),
    result: v.nullable(v.record(v.string(), v.unknown())),
    errorMessage: v.nullable(v.string()),
    expiresAt: v.pipe(v.string(), v.isoTimestamp()),
    confirmedAt: v.nullable(v.pipe(v.string(), v.isoTimestamp())),
    executedAt: v.nullable(v.pipe(v.string(), v.isoTimestamp())),
    cancelledAt: v.nullable(v.pipe(v.string(), v.isoTimestamp())),
    createdAt: v.pipe(v.string(), v.isoTimestamp()),
    updatedAt: v.pipe(v.string(), v.isoTimestamp()),
})

export const AssistantSyncAvailableMessageSchema = v.object({
    ...BaseMessageSchema.entries,

    type: v.literal("assistant:sync_available"),
    latestSyncId: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export const AssistantLiveDeltaMessageSchema = v.object({
    ...BaseMessageSchema.entries,

    type: v.literal("assistant:live_delta"),
    conversationId: v.string(),
    partId: v.string(),
    runId: v.nullable(v.string()),
    delta: v.string(),
    content: v.string(),
})

export type AssistantActionStatus = v.InferOutput<typeof AssistantActionStatusSchema>
export type AssistantActionRiskLevel = v.InferOutput<typeof AssistantActionRiskLevelSchema>
export type AssistantRealtimeAction = v.InferOutput<typeof AssistantRealtimeActionSchema>
export type AssistantSyncAvailableMessage = v.InferOutput<
    typeof AssistantSyncAvailableMessageSchema
>
export type AssistantLiveDeltaMessage = v.InferOutput<typeof AssistantLiveDeltaMessageSchema>
export type AssistantRealtimeMessage = AssistantSyncAvailableMessage | AssistantLiveDeltaMessage

// ============================================================================
// VoIP / Audio Calls
// ============================================================================

export const CallParticipantInfoSchema = v.object({
    userId: v.string(),
    userName: v.string(),
})

export const WebRtcSdpTypeSchema = v.picklist(["answer", "offer", "pranswer", "rollback"])

export const WebRtcSessionDescriptionSchema = v.object({
    type: WebRtcSdpTypeSchema,
    sdp: v.optional(v.string()),
})

export const WebRtcOfferSchema = v.object({
    .../*@valibot-migrate we can't detect if WebRtcSessionDescriptionSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    WebRtcSessionDescriptionSchema.entries,

    type: v.literal("offer"),
    sdp: v.string(),
})

export const WebRtcAnswerSchema = v.object({
    .../*@valibot-migrate we can't detect if WebRtcSessionDescriptionSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    WebRtcSessionDescriptionSchema.entries,

    type: v.literal("answer"),
    sdp: v.string(),
})

export const WebRtcIceCandidateSchema = v.object({
    candidate: v.string(),
    sdpMid: v.optional(v.nullable(v.string())),
    sdpMLineIndex: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
    usernameFragment: v.optional(v.nullable(v.string())),
})

export const WebRtcOauthCredentialSchema = v.object({
    accessToken: v.string(),
    macKey: v.string(),
})

export const WebRtcIceServerSchema = v.object({
    urls: v.union([v.string(), v.pipe(v.array(v.string()), v.minLength(1))]),
    username: v.optional(v.string()),
    credential: v.optional(v.union([v.string(), WebRtcOauthCredentialSchema])),
    credentialType: v.optional(v.picklist(["oauth", "password"])),
})

export const WebRtcConfigSchema = v.object({
    peerId: v.optional(v.string()),
    iceServers: v.optional(v.array(WebRtcIceServerSchema)),
    iceTransportPolicy: v.optional(v.picklist(["all", "relay"])),
    bundlePolicy: v.optional(v.picklist(["balanced", "max-bundle", "max-compat"])),
    rtcpMuxPolicy: v.optional(v.literal("require")),
    iceCandidatePoolSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

export type WebRtcSdpType = v.InferOutput<typeof WebRtcSdpTypeSchema>
export type WebRtcSessionDescription = v.InferOutput<typeof WebRtcSessionDescriptionSchema>
export type WebRtcOffer = v.InferOutput<typeof WebRtcOfferSchema>
export type WebRtcAnswer = v.InferOutput<typeof WebRtcAnswerSchema>
export type WebRtcIceCandidate = v.InferOutput<typeof WebRtcIceCandidateSchema>
export type WebRtcOauthCredential = v.InferOutput<typeof WebRtcOauthCredentialSchema>
export type WebRtcIceServer = v.InferOutput<typeof WebRtcIceServerSchema>
export type WebRtcConfig = v.InferOutput<typeof WebRtcConfigSchema>

export const VoIPCallRequestMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("call:request"),
    conversationId: v.string(),
    callType: v.picklist(["audio", "video"]),
    callId: v.optional(v.string()),
    participantCount: v.optional(v.number()),
    fromUserId: v.optional(v.string()),
    fromUserName: v.optional(v.string()),
    fromUserImage: v.optional(v.nullable(v.string())),
    webrtcConfig: v.optional(WebRtcConfigSchema),
    callParticipants: v.optional(v.array(CallParticipantInfoSchema)),
})

export const VoIPCallResponseMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("call:response"),
    accepted: v.boolean(),
    conversationId: v.string(),
    callId: v.optional(v.string()),
    participantJoined: v.optional(v.string()),
    participantLeft: v.optional(v.string()),
    fromUserId: v.optional(v.string()),
    fromUserName: v.optional(v.string()),
    fromUserImage: v.optional(v.nullable(v.string())),
    webrtcConfig: v.optional(WebRtcConfigSchema),
})

export const VoIPOfferMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("voip:offer"),
    offer: WebRtcOfferSchema,
    conversationId: v.string(),
    callId: v.optional(v.string()),
    fromUserId: v.optional(v.string()),
    targetUserId: v.optional(v.string()),
})

export const VoIPAnswerMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("voip:answer"),
    answer: WebRtcAnswerSchema,
    conversationId: v.string(),
    callId: v.optional(v.string()),
    fromUserId: v.optional(v.string()),
    targetUserId: v.optional(v.string()),
})

export const VoIPIceCandidateMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("voip:ice_candidate"),
    candidate: WebRtcIceCandidateSchema,
    conversationId: v.string(),
    callId: v.optional(v.string()),
    fromUserId: v.optional(v.string()),
    targetUserId: v.optional(v.string()),
})

export const VoIPCallEndMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("call:end"),
    conversationId: v.string(),
    callId: v.optional(v.string()),
    fromUserId: v.optional(v.string()),
    endedBy: v.optional(v.string()),
    reason: v.optional(v.string()),
})

export const VoIPCallCancelledMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("call:cancelled"),
    conversationId: v.string(),
    callId: v.string(),
    acceptedBy: v.optional(v.string()),
    acceptedByName: v.optional(v.string()),
})

export const VoIPSpeakerUpdateMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("call:speaker_update"),
    conversationId: v.string(),
    callId: v.string(),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    isSpeaking: v.optional(v.boolean()),

    speaker: v.optional(
        v.object({
            userId: v.string(),
            isSpeaking: v.boolean(),
        })
    ),

    fromUserId: v.optional(v.string()),
})

export const VoIPMuteStatusMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("call:mute_status"),
    conversationId: v.string(),
    callId: v.string(),
    isMuted: v.boolean(),
    fromUserId: v.optional(v.string()),
})

export const VoIPCallInitiatedMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("call:initiated"),
    conversationId: v.string(),
    callId: v.optional(v.string()),
    callType: v.optional(v.picklist(["audio", "video"])),
    participantCount: v.optional(v.number()),
    participantsCount: v.optional(v.number()),
    invitedParticipants: v.optional(v.array(v.string())),
    fromUserId: v.optional(v.string()),
    fromUserName: v.optional(v.string()),
    fromUserImage: v.optional(v.nullable(v.string())),
    webrtcConfig: v.optional(WebRtcConfigSchema),
})

export type VoIPCallRequestMessage = v.InferOutput<typeof VoIPCallRequestMessageSchema>
export type VoIPCallResponseMessage = v.InferOutput<typeof VoIPCallResponseMessageSchema>
export type VoIPOfferMessage = v.InferOutput<typeof VoIPOfferMessageSchema>
export type VoIPAnswerMessage = v.InferOutput<typeof VoIPAnswerMessageSchema>
export type VoIPIceCandidateMessage = v.InferOutput<typeof VoIPIceCandidateMessageSchema>
export type VoIPCallEndMessage = v.InferOutput<typeof VoIPCallEndMessageSchema>
export type VoIPCallCancelledMessage = v.InferOutput<typeof VoIPCallCancelledMessageSchema>
export type VoIPSpeakerUpdateMessage = v.InferOutput<typeof VoIPSpeakerUpdateMessageSchema>
export type VoIPMuteStatusMessage = v.InferOutput<typeof VoIPMuteStatusMessageSchema>
export type VoIPCallInitiatedMessage = v.InferOutput<typeof VoIPCallInitiatedMessageSchema>

// ============================================================================
// Error Handling
// ============================================================================

export const ErrorMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("error"),
    message: v.string(),
    code: v.optional(v.string()),
    details: v.optional(v.record(v.string(), v.unknown())),
})

export const CallErrorMessageSchema = v.object({
    .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    BaseMessageSchema.entries,

    type: v.literal("error:call"),
    message: v.string(),
})

export type ErrorMessage = v.InferOutput<typeof ErrorMessageSchema>
export type CallErrorMessage = v.InferOutput<typeof CallErrorMessageSchema>

// ============================================================================
// Custom Data Message (for extensibility)
// ============================================================================

const explicitMessageTypes = new Set([
    "connection:established",
    "connection:ping",
    "connection:pong",
    "connection:shutdown",
    "chat:typing",
    "message:new",
    "message:edited",
    "message:deleted",
    "system_message",
    "message_read",
    "notification:new",
    "status:updated",
    "organization:updated",
    "presence:batch",
    "presence:update",
    "presence:subscribe",
    "presence:unsubscribe",
    "conversation:participants",
    "conversation:set_active",
    "assistant:conversation_created",
    "assistant:title_updated",
    "assistant:conversation_deleted",
    "assistant:part_started",
    "assistant:part_delta",
    "assistant:part_completed",
    "assistant:action_proposed",
    "assistant:action_updated",
    "assistant:run_completed",
    "assistant:run_failed",
    "assistant:sync_available",
    "assistant:live_delta",
    "call:request",
    "call:response",
    "call:end",
    "call:cancelled",
    "voip:offer",
    "voip:answer",
    "voip:ice_candidate",
    "call:speaker_update",
    "call:mute_status",
    "call:initiated",
    "error",
    "error:call",
])

export const CustomDataMessageSchema = v.objectWithRest(
    {
        .../*@valibot-migrate we can't detect if BaseMessageSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
        BaseMessageSchema.entries,

        type: v.pipe(
            v.string(),
            v.check(
                (type) => !explicitMessageTypes.has(type),
                "Known WebSocket message types must match their explicit schema"
            )
        ),

        data: OptionalRecordSchema,
        messageId: v.optional(v.string()),
        conversationId: v.optional(v.string()),
    },
    v.unknown()
) // Allow additional properties

export type CustomDataMessage = v.InferOutput<typeof CustomDataMessageSchema>

// ============================================================================
// Message Direction Types
// ============================================================================

/**
 * Messages sent FROM client TO server
 */
export const IncomingMessageSchema = v.union([
    TypingMessageSchema,
    NewMessageMessageSchema,
    SetActiveConversationMessageSchema,
    SubscribePresenceMessageSchema,
    UnsubscribePresenceMessageSchema,
    VoIPCallRequestMessageSchema,
    VoIPCallResponseMessageSchema,
    VoIPCallEndMessageSchema,
    VoIPSpeakerUpdateMessageSchema,
    VoIPMuteStatusMessageSchema,
    VoIPCallInitiatedMessageSchema,
    PongMessageSchema,
    CustomDataMessageSchema,
])

/**
 * Messages sent FROM server TO client
 */
export const OutgoingMessageSchema = v.union([
    ConnectionEstablishedMessageSchema,
    ServerPingMessageSchema,
    ServerShutdownMessageSchema,
    StatusUpdatedMessageSchema,
    OrganizationUpdatedMessageSchema,
    PresenceBatchMessageSchema,
    PresenceUpdateMessageSchema,
    ConversationParticipantsMessageSchema,
    SetActiveConversationMessageSchema,
    AssistantSyncAvailableMessageSchema,
    AssistantLiveDeltaMessageSchema,
    TypingMessageSchema,
    NewMessageMessageSchema,
    MessageEditedMessageSchema,
    MessageDeletedMessageSchema,
    SystemMessageSchema,
    MessageReadMessageSchema,
    NotificationMessageSchema,
    VoIPCallRequestMessageSchema,
    VoIPCallResponseMessageSchema,
    VoIPCallCancelledMessageSchema,
    VoIPOfferMessageSchema,
    VoIPAnswerMessageSchema,
    VoIPIceCandidateMessageSchema,
    VoIPCallEndMessageSchema,
    VoIPSpeakerUpdateMessageSchema,
    VoIPMuteStatusMessageSchema,
    VoIPCallInitiatedMessageSchema,
    ErrorMessageSchema,
    CallErrorMessageSchema,
    CustomDataMessageSchema,
])

export type IncomingMessage = v.InferOutput<typeof IncomingMessageSchema>
export type OutgoingMessage = v.InferOutput<typeof OutgoingMessageSchema>

/**
 * All possible WebSocket messages (bidirectional)
 */
export type WebSocketMessage = IncomingMessage | OutgoingMessage
