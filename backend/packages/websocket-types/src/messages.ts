import { z } from 'zod'

/**
 * Message version for protocol evolution
 */
export const MESSAGE_VERSION = '1.0.0'

/**
 * Base schema for all WebSocket messages
 */
export const BaseMessageSchema = z.object({
  type: z.string(),
  timestamp: z.iso.datetime(),
  version: z.string().optional(),
})

export type BaseMessage = z.infer<typeof BaseMessageSchema>

// ============================================================================
// Connection & Health Messages
// ============================================================================

export const ConnectionEstablishedMessageSchema = BaseMessageSchema.extend({
  type: z.literal('connection:established'),
  userId: z.string(),
})

export const ServerPingMessageSchema = BaseMessageSchema.extend({
  type: z.literal('connection:ping'),
})

export const PongMessageSchema = BaseMessageSchema.extend({
  type: z.literal('connection:pong'),
})

export const ServerShutdownMessageSchema = BaseMessageSchema.extend({
  type: z.literal('connection:shutdown'),
})

export type ConnectionEstablishedMessage = z.infer<typeof ConnectionEstablishedMessageSchema>
export type ServerPingMessage = z.infer<typeof ServerPingMessageSchema>
export type PongMessage = z.infer<typeof PongMessageSchema>
export type ServerShutdownMessage = z.infer<typeof ServerShutdownMessageSchema>

// ============================================================================
// Chat & Messaging
// ============================================================================

export const TypingMessageSchema = BaseMessageSchema.extend({
  type: z.literal('chat:typing'),
  conversationId: z.string(),
  isTyping: z.boolean(),
  userId: z.string().optional(),
})

export const NewMessageDataSchema = z.object({
  id: z.string(),
  content: z.string(),
  senderId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Server-enriched fields populated by message.services before broadcast.
  // Optional because the canonical shape is id/content/senderId/timestamps;
  // the rest is convenience info the UI renders directly.
  conversationId: z.string().optional(),
  messageType: z.string().optional(),
  replyToId: z.string().nullable().optional(),
  replyTo: z.unknown().optional(),
  senderName: z.string().optional(),
  senderImage: z.string().nullable().optional(),
  organizationName: z.string().nullable().optional(),
  memberRole: z.string().nullable().optional(),
})

export const NewMessageMessageSchema = BaseMessageSchema.extend({
  type: z.literal('message:new'),
  conversationId: z.string(),
  data: NewMessageDataSchema,
})

export const MessageEditedDataSchema = z.object({
  id: z.string(),
  content: z.string(),
  isEdited: z.boolean(),
  updatedAt: z.iso.datetime(),
})

export const MessageEditedMessageSchema = BaseMessageSchema.extend({
  type: z.literal('message:edited'),
  conversationId: z.string(),
  data: MessageEditedDataSchema,
})

export const MessageDeletedMessageSchema = BaseMessageSchema.extend({
  type: z.literal('message:deleted'),
  conversationId: z.string(),
  messageId: z.string(),
})

export type TypingMessage = z.infer<typeof TypingMessageSchema>
export type NewMessageData = z.infer<typeof NewMessageDataSchema>
export type NewMessageMessage = z.infer<typeof NewMessageMessageSchema>
export type MessageEditedData = z.infer<typeof MessageEditedDataSchema>
export type MessageEditedMessage = z.infer<typeof MessageEditedMessageSchema>
export type MessageDeletedMessage = z.infer<typeof MessageDeletedMessageSchema>

// ============================================================================
// Notifications
// ============================================================================
// notifications:subscribe / notifications:subscribed removed — clients are
// auto-subscribed on WS connect (see realtime.services.ts handleConnection).

export const NotificationMessageSchema = BaseMessageSchema.extend({
  type: z.literal('notification:new'),
  notificationId: z.string(),
  notificationType: z.enum(['message', 'conversation_update', 'request_update', 'system']),
  title: z.string().optional(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.iso.datetime(),
  isRead: z.boolean(),
  isArchived: z.boolean(),
})

export type NotificationMessage = z.infer<typeof NotificationMessageSchema>

// ============================================================================
// Status Updates
// ============================================================================
// status:update (incoming) replaced by PATCH /api/users/me/status. The server
// still pushes status:updated to the user's other tabs/devices.

export const StatusUpdatedMessageSchema = BaseMessageSchema.extend({
  type: z.literal('status:updated'),
  status: z.string(),
})

export type StatusUpdatedMessage = z.infer<typeof StatusUpdatedMessageSchema>

// ============================================================================
// Presence Updates
// ============================================================================

export const PresenceStatusSchema = z.enum(['online', 'offline'])

export const UserPresenceInfoSchema = z.object({
  userId: z.string(),
  status: PresenceStatusSchema,
  lastActiveAt: z.string(),
})

export const PresenceBatchMessageSchema = BaseMessageSchema.extend({
  type: z.literal('presence:batch'),
  users: z.array(UserPresenceInfoSchema),
})

export const PresenceUpdateMessageSchema = BaseMessageSchema.extend({
  type: z.literal('presence:update'),
  userId: z.string(),
  status: PresenceStatusSchema,
  lastActiveAt: z.string(),
})

export const SubscribePresenceMessageSchema = BaseMessageSchema.extend({
  type: z.literal('presence:subscribe'),
  userIds: z.array(z.string()),
})

export const UnsubscribePresenceMessageSchema = BaseMessageSchema.extend({
  type: z.literal('presence:unsubscribe'),
  userIds: z.array(z.string()),
})

export type PresenceStatus = z.infer<typeof PresenceStatusSchema>
export type UserPresenceInfo = z.infer<typeof UserPresenceInfoSchema>
export type PresenceBatchMessage = z.infer<typeof PresenceBatchMessageSchema>
export type PresenceUpdateMessage = z.infer<typeof PresenceUpdateMessageSchema>
export type SubscribePresenceMessage = z.infer<typeof SubscribePresenceMessageSchema>
export type UnsubscribePresenceMessage = z.infer<typeof UnsubscribePresenceMessageSchema>

// ============================================================================
// Organization Updates
// ============================================================================

export const OrganizationUpdatedDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  brandLogo: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  brandColor: z.string().optional(),
  font: z.string().optional(),
})

export const OrganizationUpdatedMessageSchema = BaseMessageSchema.extend({
  type: z.literal('organization:updated'),
  organization: OrganizationUpdatedDataSchema,
  previousSlug: z.string().nullable().optional(),
})

export type OrganizationUpdatedData = z.infer<typeof OrganizationUpdatedDataSchema>
export type OrganizationUpdatedMessage = z.infer<typeof OrganizationUpdatedMessageSchema>

// ============================================================================
// Conversation Participants
// ============================================================================

export const ConversationParticipantInfoSchema = z.object({
  userId: z.string(),
  name: z.string(),
  image: z.string().optional(),
})

export const ConversationParticipantsMessageSchema = BaseMessageSchema.extend({
  type: z.literal('conversation:participants'),
  conversationId: z.string(),
  participants: z.array(ConversationParticipantInfoSchema),
})

export const SetActiveConversationMessageSchema = BaseMessageSchema.extend({
  type: z.literal('conversation:set_active'),
  conversationId: z.string().nullable(),
})

export type ConversationParticipantInfo = z.infer<typeof ConversationParticipantInfoSchema>
export type ConversationParticipantsMessage = z.infer<typeof ConversationParticipantsMessageSchema>
export type SetActiveConversationMessage = z.infer<typeof SetActiveConversationMessageSchema>

// ============================================================================
// Quest Assistant Realtime Events
// ============================================================================

export const AssistantActionStatusSchema = z.enum([
  'proposed',
  'executed',
  'cancelled',
  'expired',
  'failed',
])
export const AssistantActionRiskLevelSchema = z.enum(['low', 'medium', 'high', 'destructive'])

export const AssistantRealtimeActionSchema = z.object({
  id: z.string(),
  conversationId: z.string().nullable(),
  userId: z.string(),
  organizationId: z.string().nullable(),
  type: z.literal('open_page'),
  status: AssistantActionStatusSchema,
  title: z.string(),
  summary: z.string(),
  buttonLabel: z.string(),
  riskLevel: AssistantActionRiskLevelSchema,
  requiresConfirmation: z.boolean(),
  payload: z.record(z.string(), z.unknown()),
  preview: z.record(z.string(), z.unknown()).nullable(),
  result: z.record(z.string(), z.unknown()).nullable(),
  errorMessage: z.string().nullable(),
  expiresAt: z.iso.datetime(),
  confirmedAt: z.iso.datetime().nullable(),
  executedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const AssistantSyncAvailableMessageSchema = BaseMessageSchema.extend({
  type: z.literal('assistant:sync_available'),
  latestSyncId: z.number().int().nonnegative(),
})

export const AssistantLiveDeltaMessageSchema = BaseMessageSchema.extend({
  type: z.literal('assistant:live_delta'),
  conversationId: z.string(),
  partId: z.string(),
  runId: z.string().nullable(),
  delta: z.string(),
  content: z.string(),
})

export type AssistantActionStatus = z.infer<typeof AssistantActionStatusSchema>
export type AssistantActionRiskLevel = z.infer<typeof AssistantActionRiskLevelSchema>
export type AssistantRealtimeAction = z.infer<typeof AssistantRealtimeActionSchema>
export type AssistantSyncAvailableMessage = z.infer<typeof AssistantSyncAvailableMessageSchema>
export type AssistantLiveDeltaMessage = z.infer<typeof AssistantLiveDeltaMessageSchema>
export type AssistantRealtimeMessage = AssistantSyncAvailableMessage | AssistantLiveDeltaMessage

// ============================================================================
// VoIP / Audio Calls
// ============================================================================

export const CallParticipantInfoSchema = z.object({
  userId: z.string(),
  userName: z.string(),
})

export const VoIPCallRequestMessageSchema = BaseMessageSchema.extend({
  type: z.literal('call:request'),
  conversationId: z.string(),
  callType: z.literal('audio'),
  callId: z.string().optional(),
  participantCount: z.number().optional(),
  fromUserId: z.string().optional(),
  fromUserName: z.string().optional(),
  fromUserImage: z.string().optional(),
  webrtcConfig: z.any().optional(),
  callParticipants: z.array(CallParticipantInfoSchema).optional(),
})

export const VoIPCallResponseMessageSchema = BaseMessageSchema.extend({
  type: z.literal('call:response'),
  accepted: z.boolean(),
  conversationId: z.string(),
  callId: z.string().optional(),
  participantJoined: z.string().optional(),
  participantLeft: z.string().optional(),
  fromUserId: z.string().optional(),
  webrtcConfig: z
    .object({
      peerId: z.string(),
    })
    .optional(),
})

export const VoIPOfferMessageSchema = BaseMessageSchema.extend({
  type: z.literal('voip:offer'),
  offer: z.any(), // RTCSessionDescriptionInit
  conversationId: z.string(),
  callId: z.string().optional(),
  fromUserId: z.string().optional(),
  targetUserId: z.string().optional(),
})

export const VoIPAnswerMessageSchema = BaseMessageSchema.extend({
  type: z.literal('voip:answer'),
  answer: z.any(), // RTCSessionDescriptionInit
  conversationId: z.string(),
  callId: z.string().optional(),
  fromUserId: z.string().optional(),
  targetUserId: z.string().optional(),
})

export const VoIPIceCandidateMessageSchema = BaseMessageSchema.extend({
  type: z.literal('voip:ice_candidate'),
  candidate: z.any(), // RTCIceCandidateInit
  conversationId: z.string(),
  callId: z.string().optional(),
  fromUserId: z.string().optional(),
  targetUserId: z.string().optional(),
})

export const VoIPCallEndMessageSchema = BaseMessageSchema.extend({
  type: z.literal('call:end'),
  conversationId: z.string(),
  callId: z.string().optional(),
  fromUserId: z.string().optional(),
})

export const VoIPSpeakerUpdateMessageSchema = BaseMessageSchema.extend({
  type: z.literal('call:speaker_update'),
  conversationId: z.string(),
  callId: z.string(),
  userId: z.string(),
  userName: z.string(),
  isSpeaking: z.boolean(),
  fromUserId: z.string().optional(),
})

export const VoIPMuteStatusMessageSchema = BaseMessageSchema.extend({
  type: z.literal('call:mute_status'),
  conversationId: z.string(),
  callId: z.string(),
  isMuted: z.boolean(),
  fromUserId: z.string().optional(),
})

export const VoIPCallInitiatedMessageSchema = BaseMessageSchema.extend({
  type: z.literal('call:initiated'),
  conversationId: z.string(),
  callId: z.string().optional(),
  participantCount: z.number(),
  invitedParticipants: z.array(z.string()),
  webrtcConfig: z.any().optional(),
})

export type VoIPCallRequestMessage = z.infer<typeof VoIPCallRequestMessageSchema>
export type VoIPCallResponseMessage = z.infer<typeof VoIPCallResponseMessageSchema>
export type VoIPOfferMessage = z.infer<typeof VoIPOfferMessageSchema>
export type VoIPAnswerMessage = z.infer<typeof VoIPAnswerMessageSchema>
export type VoIPIceCandidateMessage = z.infer<typeof VoIPIceCandidateMessageSchema>
export type VoIPCallEndMessage = z.infer<typeof VoIPCallEndMessageSchema>
export type VoIPSpeakerUpdateMessage = z.infer<typeof VoIPSpeakerUpdateMessageSchema>
export type VoIPMuteStatusMessage = z.infer<typeof VoIPMuteStatusMessageSchema>
export type VoIPCallInitiatedMessage = z.infer<typeof VoIPCallInitiatedMessageSchema>

// ============================================================================
// Error Handling
// ============================================================================

export const ErrorMessageSchema = BaseMessageSchema.extend({
  type: z.literal('error'),
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

export const CallErrorMessageSchema = BaseMessageSchema.extend({
  type: z.literal('error:call'),
  message: z.string(),
})

export type ErrorMessage = z.infer<typeof ErrorMessageSchema>
export type CallErrorMessage = z.infer<typeof CallErrorMessageSchema>

// ============================================================================
// Custom Data Message (for extensibility)
// ============================================================================

const explicitMessageTypes = new Set([
  'connection:established',
  'connection:ping',
  'connection:pong',
  'connection:shutdown',
  'chat:typing',
  'message:new',
  'message:edited',
  'message:deleted',
  'notification:new',
  'status:updated',
  'organization:updated',
  'presence:batch',
  'presence:update',
  'presence:subscribe',
  'presence:unsubscribe',
  'conversation:participants',
  'conversation:set_active',
  'assistant:conversation_created',
  'assistant:title_updated',
  'assistant:conversation_deleted',
  'assistant:part_started',
  'assistant:part_delta',
  'assistant:part_completed',
  'assistant:action_proposed',
  'assistant:action_updated',
  'assistant:run_completed',
  'assistant:run_failed',
  'assistant:sync_available',
  'assistant:live_delta',
  'call:request',
  'call:response',
  'call:end',
  'voip:offer',
  'voip:answer',
  'voip:ice_candidate',
  'call:speaker_update',
  'call:mute_status',
  'call:initiated',
  'error',
  'error:call',
])

export const CustomDataMessageSchema = BaseMessageSchema.extend({
  type: z
    .string()
    .refine(
      (type) => !explicitMessageTypes.has(type),
      'Known WebSocket message types must match their explicit schema'
    ),
  data: z.record(z.string(), z.unknown()).optional(),
  messageId: z.string().optional(),
  conversationId: z.string().optional(),
}).catchall(z.unknown()) // Allow additional properties

export type CustomDataMessage = z.infer<typeof CustomDataMessageSchema>

// ============================================================================
// Message Direction Types
// ============================================================================

/**
 * Messages sent FROM client TO server
 */
export const IncomingMessageSchema = z.union([
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
export const OutgoingMessageSchema = z.union([
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
  NotificationMessageSchema,
  VoIPCallRequestMessageSchema,
  VoIPCallResponseMessageSchema,
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

export type IncomingMessage = z.infer<typeof IncomingMessageSchema>
export type OutgoingMessage = z.infer<typeof OutgoingMessageSchema>

/**
 * All possible WebSocket messages (bidirectional)
 */
export type WebSocketMessage = IncomingMessage | OutgoingMessage
