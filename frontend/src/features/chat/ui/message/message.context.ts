import { createContext, type ReactNode, use } from "react"
import type { ConversationType } from "../../model/chat"
import type { ReaderInfo } from "../../model/hooks/use-message-read-status"

export interface SenderInfo {
    type: "organization" | "user"
    id: string | null
    name: string
    logo?: string | null
    image?: string | null
}

interface Attachment {
    id: string
    filename: string
    originalName: string
    size: number
    mimeType: string
    s3Key: string
    url?: string
    downloadUrl?: string
    uploadedAt: string
    uploadedBy: string
}

interface ReplyToInfo {
    id: string
    senderId: string
    senderName: string
    senderImage?: string | null
    content: string
    messageType: string
    createdAt: string
    isDeleted?: boolean
}

export interface MessageState {
    id: string
    content: string
    messageType: "text" | "system"
    senderId: string
    createdAt: string
    updatedAt: string
    isEdited: boolean
    isDeleted: boolean
    isPinned: boolean
    isOptimistic: boolean
    senderInfo?: SenderInfo
    organizationName?: string | null
    memberRole?: string | null
    hasAvatar: boolean
    isLastInGroup: boolean
    shouldShowSeen: boolean
    readers: ReaderInfo[]
    metadata?: {
        attachments?: Attachment[]
        requestId?: string
        requestNumber?: string
        type?: string
        pinnedByName?: string
        mentions?: {
            type: "user" | "role"
            id: string
            name: string
        }[]
        systemEventKey?: string
        systemEventParams?: Record<string, unknown>
    }
    replyTo?: ReplyToInfo | null
}

export interface MessageActions {
    onReply?: (messageId: string, content: string, senderName: string) => void
    onEdit?: (messageId: string, content: string) => void
    onDelete?: (
        messageId: string,
        content: string,
        senderName: string,
        senderImage: string | null | undefined,
        createdAt: string
    ) => void
    onSaveEdit?: (messageId: string, newContent: string) => Promise<void>
    onViewProfile?: (userId: string) => void
    onPin?: (messageId: string) => void
    onUnpin?: (messageId: string) => void
    onViewPinnedMessages?: () => void
}

export interface SharedRequestMessageRenderProps {
    id: string
    content: string
    createdAt: string
    requestNumber: string
    isTeamChat: boolean
    conversationType: ConversationType
    userId: string
    userOrganizationId?: string | null
    conversationOrganizationId?: string | null
    isViewingRequest: boolean
    onViewRequest: () => void
}

export interface RequestMessageIntegration {
    isRequestOpen: (requestNumber: string) => boolean
    openRequest: (
        requestNumber: string,
        options?: {
            fromTeamChat?: boolean
            teamChatOrganizationId?: string | null
        }
    ) => void
    downloadPdf: (requestId: string, requestNumber: string) => Promise<void>
    renderSharedRequest?: (props: SharedRequestMessageRenderProps) => ReactNode
}

export interface MessageMeta {
    userId: string
    userOrganizationId?: string | null
    conversationOrganizationId?: string | null
    isTeamChat: boolean
    conversationType: ConversationType
    currentUserRole?: string
    requestId?: string
    requestNumber?: string
    requestIntegration?: RequestMessageIntegration
}

export interface MessagePermissions {
    isOwnMessage: boolean
    viewerInSameOrg: boolean
    senderName: string
    canEdit: boolean
    canDelete: boolean
    canReply: boolean
    canPin: boolean
    canUnpin: boolean
}

export interface MessageContextValue {
    state: MessageState
    actions: MessageActions
    meta: MessageMeta
    permissions: MessagePermissions
}

export const MessageContext = createContext<MessageContextValue | null>(null)

export const useMessage = (): MessageContextValue => {
    const context = use(MessageContext)
    if (!context) {
        throw new Error("useMessage must be used within a Message.Provider")
    }
    return context
}
