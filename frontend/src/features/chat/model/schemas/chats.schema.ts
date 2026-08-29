import * as v from "valibot"
import { optionalHttpUrlSchema } from "@/shared/lib/validation/url.schema"
import { type ConversationType, deriveConversationType } from "../conversation-type"

function preprocess<TSchema extends v.GenericSchema>(
    action: (value: unknown) => unknown,
    schema: TSchema
): v.GenericSchema<unknown, v.InferOutput<TSchema>> {
    return v.pipe(v.unknown(), v.transform(action), schema)
}

const lastMessageSchema = v.object({
    id: v.optional(v.string()),
    content: v.string(),
    messageType: v.optional(v.string()),
    senderId: v.string(),
    senderName: v.optional(v.string()),
    createdAt: v.string(),
    isUnread: v.optional(v.boolean()),
    metadata: v.pipe(
        v.optional(v.nullable(v.record(v.string(), v.unknown()))),
        v.transform((value) => value ?? undefined)
    ),
})

const participantSchema = v.object({
    id: v.string(),
    name: v.string(),
    image: v.optional(v.nullable(v.string())),
})

const contextInfoSchema = v.object({
    type: v.union([v.literal("organization"), v.literal("user")]),
    id: v.nullable(v.string()),
    name: v.string(),
    logo: v.optional(v.nullable(v.string())),
    image: v.optional(v.nullable(v.string())),
    email: v.optional(v.nullable(v.string())),
})

const conversationBaseSchema = v.object({
    id: v.string(),
    name: v.string(),
    lastMessage: v.nullable(lastMessageSchema),
    messageCount: v.optional(v.number()),
    participants: v.optional(v.array(participantSchema)),
    updatedAt: v.string(),
    contextInfo: v.optional(v.nullable(contextInfoSchema)),
    isPinned: v.optional(v.boolean()),
    pinnedAt: v.optional(v.nullable(v.string())),
    role: v.optional(v.string()),
})

const teamConversationSchema = v.pipe(
    v.object({
        .../*@valibot-migrate we can't detect if conversationBaseSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
        conversationBaseSchema.entries,

        conversationType: v.optional(v.literal("team")),
        isTeamChat: v.optional(v.literal(true)),
        organizationId: v.pipe(v.string(), v.minLength(1)),
    }),
    v.check(
        (conversation) => deriveConversationType(conversation) === "team",
        "Conversation must include a team conversation type"
    ),
    v.transform((conversation) => ({
        ...conversation,
        conversationType: "team" as const,
        isTeamChat: true as const,
    }))
)

const memberDmConversationSchema = v.pipe(
    v.object({
        .../*@valibot-migrate we can't detect if conversationBaseSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
        conversationBaseSchema.entries,

        conversationType: v.literal("member_dm"),
        isTeamChat: v.optional(v.literal(false)),
        organizationId: v.optional(v.string()),
    }),
    v.transform((conversation) => ({
        ...conversation,
        isTeamChat: false as const,
    }))
)

const requesterConversationSchema = v.pipe(
    v.object({
        .../*@valibot-migrate we can't detect if conversationBaseSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
        conversationBaseSchema.entries,

        conversationType: v.optional(v.literal("requester")),
        isTeamChat: v.optional(v.literal(false)),
        organizationId: v.optional(v.string()),
    }),
    v.check(
        (conversation) => deriveConversationType(conversation) === "requester",
        "Conversation must include a requester conversation type"
    ),
    v.transform((conversation) => ({
        ...conversation,
        conversationType: "requester" as const,
        isTeamChat: false as const,
    }))
)

export const conversationSchema = v.union([
    teamConversationSchema,
    memberDmConversationSchema,
    requesterConversationSchema,
])

const paginationSchema = v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    hasMore: v.boolean(),
})

const messageTypeSchema = preprocess(
    (value) => (value === "system" ? "system" : "text"),
    v.union([v.literal("text"), v.literal("system")])
)

const attachmentSchema = v.object({
    id: v.string(),
    filename: v.string(),
    originalName: v.string(),
    size: v.number(),
    mimeType: v.string(),
    s3Key: v.string(),
    url: optionalHttpUrlSchema,
    downloadUrl: optionalHttpUrlSchema,
    uploadedAt: v.string(),
    uploadedBy: v.string(),
})

const mentionSchema = v.object({
    type: v.union([v.literal("user"), v.literal("role")]),
    id: v.string(),
    name: v.string(),
})

const messageMetadataSchema = v.looseObject({
    attachments: v.optional(v.array(attachmentSchema)),
    requestId: v.optional(v.string()),
    requestNumber: v.optional(v.string()),
    type: v.optional(v.string()),
    pinnedByName: v.optional(v.string()),
    mentions: v.optional(v.array(mentionSchema)),
    systemEventKey: v.optional(v.string()),
    systemEventParams: v.optional(v.record(v.string(), v.unknown())),
})

const replyToMessageSchema = v.looseObject({
    id: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    senderImage: v.optional(v.nullable(v.string())),
    content: v.string(),
    messageType: v.optional(v.string(), "text"),
    createdAt: v.string(),
    isDeleted: v.optional(v.boolean()),
})

export const messageDataSchema = v.pipe(
    v.looseObject({
        id: v.string(),
        content: v.string(),
        messageType: messageTypeSchema,
        senderId: v.string(),
        senderName: v.optional(v.string()),
        senderImage: v.optional(v.nullable(v.string())),
        organizationName: v.optional(v.nullable(v.string())),
        memberRole: v.optional(v.nullable(v.string())),
        metadata: v.pipe(
            v.optional(v.nullable(messageMetadataSchema)),
            v.transform((value) => value ?? undefined)
        ),
        replyTo: v.optional(v.nullable(replyToMessageSchema)),
        isEdited: v.optional(v.boolean(), false),
        isPinned: v.optional(v.boolean()),
        isDeleted: v.optional(v.boolean(), false),
        createdAt: v.string(),
        updatedAt: v.optional(v.string()),
        historyOffset: v.optional(v.number()),
    }),
    v.transform((message) => ({
        ...message,
        replyTo: message.replyTo ?? null,
        updatedAt: message.updatedAt ?? message.createdAt,
    }))
)

export const chatMessagesPageResponseSchema = v.looseObject({
    data: v.looseObject({
        messages: v.array(messageDataSchema),
        pagination: v.optional(v.partial(paginationSchema)),
    }),
})

export const chatConversationsResponseSchema = v.looseObject({
    data: v.looseObject({
        conversations: v.array(conversationSchema),
    }),
})

export const chatMessageMutationResponseSchema = v.looseObject({
    success: v.optional(v.literal(true)),
    data: messageDataSchema,
})

export const conversationsListResponseSchema = v.object({
    success: v.literal(true),
    data: v.object({
        conversations: v.array(conversationSchema),
        pagination: paginationSchema,
    }),
})

export const participantsResponseSchema = v.looseObject({
    success: v.literal(true),
    data: v.looseObject({
        participants: v.array(
            v.looseObject({
                userId: v.string(),
                name: v.string(),
                image: v.optional(v.nullable(optionalHttpUrlSchema)),
            })
        ),
    }),
})

export const chatApiErrorResponseSchema = v.looseObject({
    success: v.optional(v.boolean()),
    message: v.optional(v.string()),
})

export const pinnedMessageSchema = v.looseObject({
    id: v.string(),
    content: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    senderImage: v.optional(v.nullable(v.string())),
    createdAt: v.string(),
    pinnedAt: v.string(),
    pinnedById: v.string(),
})

export const pinnedMessagesResponseSchema = v.looseObject({
    data: v.optional(
        v.looseObject({
            messages: v.optional(v.array(pinnedMessageSchema)),
        })
    ),
})

export const messageSearchResponseSchema = v.looseObject({
    data: v.optional(
        v.looseObject({
            messages: v.optional(v.array(messageDataSchema)),
            pagination: v.optional(v.partial(paginationSchema)),
        })
    ),
    message: v.optional(v.string()),
})

const readerInfoSchema = v.object({
    userId: v.string(),
    userName: v.string(),
    userImage: v.nullable(v.string()),
    readAt: v.union([v.string(), v.date()]),
})

export const readStatusDataSchema = v.object({
    messageId: v.string(),
    seenStatus: v.picklist(["sent", "seen"]),
    readBy: v.optional(v.array(readerInfoSchema), []),
})

export const readStatusApiResponseSchema = v.pipe(
    v.looseObject({
        success: v.optional(v.boolean()),
        data: v.optional(
            v.looseObject({
                readStatuses: v.optional(v.array(readStatusDataSchema)),
            })
        ),
        readStatuses: v.optional(v.array(readStatusDataSchema)),
        message: v.optional(v.string()),
    }),
    v.transform((value) => ({
        success: value.success,
        message: value.message,
        readStatuses: value.data?.readStatuses ?? value.readStatuses ?? [],
    }))
)

export const unreadConversationsResponseSchema = v.looseObject({
    success: v.optional(v.boolean()),
    data: v.optional(
        v.looseObject({
            count: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 0),
            conversationIds: v.optional(v.array(v.string()), []),
        })
    ),
    message: v.optional(v.string()),
})

export type LastMessage = v.InferOutput<typeof lastMessageSchema>
export type Participant = v.InferOutput<typeof participantSchema>
export type ContextInfo = v.InferOutput<typeof contextInfoSchema>
export type { ConversationType }
export type Conversation = v.InferOutput<typeof conversationSchema>
export type Pagination = v.InferOutput<typeof paginationSchema>
export type Attachment = v.InferOutput<typeof attachmentSchema>
export type MessageData = v.InferOutput<typeof messageDataSchema>
export type ChatMessagesPageResponse = v.InferOutput<typeof chatMessagesPageResponseSchema>
export type ChatConversationsResponse = v.InferOutput<typeof chatConversationsResponseSchema>
export type ChatMessageMutationResponse = v.InferOutput<typeof chatMessageMutationResponseSchema>
export type ConversationsListResponse = v.InferOutput<typeof conversationsListResponseSchema>
export type ParticipantsResponse = v.InferOutput<typeof participantsResponseSchema>
export type PinnedMessage = v.InferOutput<typeof pinnedMessageSchema>
export type MessageSearchResponse = v.InferOutput<typeof messageSearchResponseSchema>
export type ReaderInfo = v.InferOutput<typeof readerInfoSchema>
export type ReadStatusData = v.InferOutput<typeof readStatusDataSchema>
