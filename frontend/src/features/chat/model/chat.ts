export type {
    Attachment,
    ChatConversationsResponse,
    ChatMessageMutationResponse,
    ChatMessagesPageResponse,
    ContextInfo,
    Conversation,
    ConversationType,
    LastMessage,
    MessageData,
    MessageSearchResponse,
    Participant,
    PinnedMessage,
    ReaderInfo,
    ReadStatusData,
} from "./schemas/chats.schema"

export interface SenderInfo {
    type: "user" | "organization"
    id: string
    name: string
    image?: string | null
    logo?: string | null
}
