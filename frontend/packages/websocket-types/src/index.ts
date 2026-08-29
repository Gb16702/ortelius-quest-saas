/**
 * @ortelius/websocket-types
 *
 * Shared WebSocket message types and schemas for the Ortelius organization platform.
 * This package provides type-safe WebSocket communication between client and server.
 *
 * @version 1.0.0
 */

export type {
    ConnectionHealth,
    ConnectionQuality,
    // Connection
    ConnectionState,
    ConnectionStats,
    CustomWebSocket,
    RateLimitInfo,
} from "./connection"
export * from "./connection"
export {
    ConnectionHealthSchema,
    ConnectionQualitySchema,
    // Connection schemas
    ConnectionStateSchema,
    ConnectionStatsSchema,
    RateLimitInfoSchema,
} from "./connection"
export type {
    AssistantActionRiskLevel,
    AssistantActionStatus,
    AssistantRealtimeAction,
    AssistantRealtimeMessage,
    AssistantSyncAvailableMessage,
    // Base
    BaseMessage,
    CallErrorMessage,
    // Connection
    ConnectionEstablishedMessage,
    // Participants
    ConversationParticipantInfo,
    ConversationParticipantsMessage,
    // Custom
    CustomDataMessage,
    // Errors
    ErrorMessage,
    // Direction
    IncomingMessage,
    MessageReadData,
    MessageReadMessage,
    MessageReadReaderInfo,
    NewMessageData,
    NewMessageMessage,
    NotificationMessage,
    OrganizationUpdatedData,
    OrganizationUpdatedMessage,
    OutgoingMessage,
    PongMessage,
    // Presence
    PresenceBatchMessage,
    PresenceStatus,
    PresenceUpdateMessage,
    ServerPingMessage,
    ServerShutdownMessage,
    SetActiveConversationMessage,
    StatusUpdatedMessage,
    SubscribePresenceMessage,
    SystemMessage,
    SystemMessageData,
    // Chat
    TypingMessage,
    UnsubscribePresenceMessage,
    UserPresenceInfo,
    VoIPAnswerMessage,
    VoIPCallCancelledMessage,
    VoIPCallEndMessage,
    VoIPCallInitiatedMessage,
    // VoIP
    VoIPCallRequestMessage,
    VoIPCallResponseMessage,
    VoIPIceCandidateMessage,
    VoIPOfferMessage,
    VoIPSpeakerUpdateMessage,
    WebRtcAnswer,
    WebRtcConfig,
    WebRtcIceCandidate,
    WebRtcIceServer,
    WebRtcOauthCredential,
    WebRtcOffer,
    WebRtcSdpType,
    WebRtcSessionDescription,
    WebSocketMessage,
} from "./messages"
export * from "./messages"
export {
    AssistantActionRiskLevelSchema,
    AssistantActionStatusSchema,
    AssistantRealtimeActionSchema,
    AssistantSyncAvailableMessageSchema,
    // Schemas for validation
    BaseMessageSchema,
    CallErrorMessageSchema,
    // Individual message schemas
    ConnectionEstablishedMessageSchema,
    ConversationParticipantInfoSchema,
    ConversationParticipantsMessageSchema,
    CustomDataMessageSchema,
    ErrorMessageSchema,
    IncomingMessageSchema,
    MESSAGE_VERSION,
    MessageReadDataSchema,
    MessageReadMessageSchema,
    MessageReadReaderInfoSchema,
    NewMessageDataSchema,
    NewMessageMessageSchema,
    NotificationMessageSchema,
    OrganizationUpdatedDataSchema,
    OrganizationUpdatedMessageSchema,
    OutgoingMessageSchema,
    PongMessageSchema,
    PresenceBatchMessageSchema,
    PresenceStatusSchema,
    PresenceUpdateMessageSchema,
    ServerPingMessageSchema,
    ServerShutdownMessageSchema,
    SetActiveConversationMessageSchema,
    StatusUpdatedMessageSchema,
    SubscribePresenceMessageSchema,
    SystemMessageDataSchema,
    SystemMessageSchema,
    TypingMessageSchema,
    UnsubscribePresenceMessageSchema,
    UserPresenceInfoSchema,
    VoIPAnswerMessageSchema,
    VoIPCallCancelledMessageSchema,
    VoIPCallEndMessageSchema,
    VoIPCallInitiatedMessageSchema,
    VoIPCallRequestMessageSchema,
    VoIPCallResponseMessageSchema,
    VoIPIceCandidateMessageSchema,
    VoIPOfferMessageSchema,
    VoIPSpeakerUpdateMessageSchema,
    WebRtcAnswerSchema,
    WebRtcConfigSchema,
    WebRtcIceCandidateSchema,
    WebRtcIceServerSchema,
    WebRtcOauthCredentialSchema,
    WebRtcOfferSchema,
    WebRtcSdpTypeSchema,
    WebRtcSessionDescriptionSchema,
} from "./messages"
export * from "./signaling"
