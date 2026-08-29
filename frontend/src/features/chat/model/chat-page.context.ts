import { createContext, type ReactNode, type RefObject, use } from "react"
import type { StickToBottomContext } from "use-stick-to-bottom"
import type { SessionResponse } from "@/entities/session"
import type { BreadcrumbNavItem } from "@/shared/ui/breadcrumb-nav"
import { MESSAGE_PAGE_LIMIT } from "../api/chat.api"
import type {
    MessageActions,
    MessageMeta,
    RequestMessageIntegration,
} from "../ui/message/message.context"
import type { MentionData } from "../ui/message-input"
import type { Conversation, MessageData, Participant, PinnedMessage } from "./chat"
import type { ChatConversationLoadState } from "./chat-conversation-access"
import type { ReaderInfo } from "./hooks/use-message-read-status"

export const EMPTY_PARTICIPANTS: Participant[] = []

export interface MessagePagination {
    total: number
    limit: number
    offset: number
    hasMore: boolean
}

export const EMPTY_MESSAGE_PAGINATION: MessagePagination = {
    total: 0,
    limit: MESSAGE_PAGE_LIMIT,
    offset: 0,
    hasMore: false,
}

export interface ReplyInputValue {
    id: string
    content: string
    senderName: string
}

export interface LoadOlderMessagesOptions {
    preserveScroll?: boolean
    allowDuringSearchJump?: boolean
}

export interface ChatPageState {
    conversations: Conversation[]
    allMessages: MessageData[]
    messagePagination: MessagePagination
    currentConversation: Conversation | undefined
    conversationLoadState: ChatConversationLoadState
    displayMessages: MessageData[]
    participants: Participant[]
    pinnedMessages: PinnedMessage[]
    typingUsersWithInfo: {
        type: "user"
        id: string
        name: string
        image: string | null
    }[]
    isInitialLoading: boolean
    isLoadingOlderMessages: boolean
    isPinnedMenuOpen: boolean
    shouldScrollToBottom: boolean
    isMac: boolean
    messageActions: MessageActions
    messageMeta: MessageMeta
    breadcrumbItems: BreadcrumbNavItem[]
    selectedFiles: File[]
    replyingTo: {
        messageId: string
        content: string
        senderName: string
    } | null
    replyInputValue: ReplyInputValue | null
    editingMessage: {
        messageId: string
        content: string
    } | null
    deletingMessage: {
        id: string
        content: string
        senderName: string
        senderImage?: string | null
        createdAt: string
    } | null
    isSubmitting: boolean
    isUploadingFiles: boolean
    isExporting: boolean
    isSearchDialogOpen: boolean
    isParticipantsDialogOpen: boolean
}

export interface ChatPageActions {
    submitMessage: (message: string, mentions?: MentionData[]) => Promise<boolean>
    exportConversation: () => Promise<void>
    scrollToMessage: (messageId: string, messageSnapshot?: MessageData) => Promise<void>
    addSelectedFiles: (files: File[]) => void
    removeSelectedFile: (index: number) => void
    replyToMessage: (messageId: string, content: string, senderName: string) => void
    cancelReply: () => void
    initiateMessageEdit: (messageId: string, content: string) => void
    promptDeleteMessage: (
        messageId: string,
        content: string,
        senderName: string,
        senderImage: string | null | undefined,
        createdAt: string
    ) => void
    confirmDeleteMessage: () => Promise<void>
    saveMessageEdit: (messageId: string, newContent: string) => Promise<void>
    pinMessage: (messageId: string) => Promise<boolean>
    unpinMessage: (messageId: string) => Promise<boolean>
    toggleConversationFavorite: (
        conversation: Conversation,
        nextValue: boolean,
        currentValue: boolean
    ) => void
    startAudioCall: () => void
    viewMemberProfile?: (userId: string) => void
    startTyping: () => void
    stopTyping: () => void
    setIsPinnedMenuOpen: (open: boolean) => void
    openSearchDialog: () => void
    closeSearchDialog: () => void
    openParticipantsDialog: () => void
    closeParticipantsDialog: () => void
    clearDeletingMessage: () => void
    setShouldScrollToBottom: (value: boolean) => void
    shouldShowSeen: (messageId: string) => boolean
    findMessageReaders: (messageId: string) => ReaderInfo[]
    loadOlderMessages: (options?: LoadOlderMessagesOptions) => Promise<boolean>
    retryInitialLoad: () => void
}

export interface ChatPageMeta {
    userId: string
    conversationId: string | undefined
    chatsHref: string
    onNavigate: ((href: string) => void) | undefined
    refs: ChatPageRefs
}

export interface ChatPageRefs {
    scrollContainerRef: RefObject<HTMLDivElement | null>
    stickToBottomContextRef: RefObject<StickToBottomContext | null>
    messageInputRef: RefObject<HTMLTextAreaElement | null>
    scrollToBottomRef: RefObject<(() => void) | null>
}

export interface ChatPageContextValue {
    state: ChatPageState
    actions: ChatPageActions
    meta: ChatPageMeta
}

export interface ChatAudioCallInput {
    conversationId: string
    conversation: Conversation
    currentUser: {
        id: string
        name: string
        email: string
        image: string | null
    }
}

export interface ChatPageProviderProps {
    basePath: string
    hrefBasePath?: string
    conversationId: string | undefined
    sessionData: SessionResponse | null
    breadcrumbItemsPrefix?: BreadcrumbNavItem[]
    requestIntegration?: RequestMessageIntegration
    onViewMemberProfile?: (userId: string) => void
    onStartAudioCall?: (input: ChatAudioCallInput) => void
    onNavigate?: (href: string) => void
    children: ReactNode
}

export const ChatPageContext = createContext<ChatPageContextValue | null>(null)

export function useChatPage(): ChatPageContextValue {
    const ctx = use(ChatPageContext)
    if (!ctx) {
        throw new Error("useChatPage must be used within ChatPageProvider")
    }
    return ctx
}
