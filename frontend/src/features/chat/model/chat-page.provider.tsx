import { type QueryClient, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useReducer, useRef, useState } from "react"
import type { StickToBottomContext } from "use-stick-to-bottom"
import {
    CONVERSATIONS_PAGE_LIMIT,
    type InitialChatPageData,
    MESSAGE_PAGE_LIMIT,
    readInitialChatPageData,
} from "../api/chat.api"
import { chatKeys } from "../api/chat.query-keys"
import { getReadStatusMessageIds, getUserMessageIds } from "../lib/chat-message-ids"
import { type ChatState, chatReducer, initialChatState } from "./chat.reducer"
import {
    type ChatPageActions,
    ChatPageContext,
    type ChatPageContextValue,
    type ChatPageMeta,
    type ChatPageProviderProps,
    type ChatPageRefs,
    type ChatPageState,
} from "./chat-page.context"
import { useChatConversationExport } from "./hooks/use-chat-conversation-export"
import { useChatConversationPinActions } from "./hooks/use-chat-conversation-pin-actions"
import { useChatMessageContextValues } from "./hooks/use-chat-message-context-values"
import { useChatMessageEditActions } from "./hooks/use-chat-message-edit-actions"
import { useChatMessageHistory } from "./hooks/use-chat-message-history"
import { useChatMessageNavigation } from "./hooks/use-chat-message-navigation"
import { useChatMessageSubmit } from "./hooks/use-chat-message-submit"
import { useChatPageDerivedState } from "./hooks/use-chat-page-derived.state"
import { useChatPageRealtime } from "./hooks/use-chat-page-realtime"
import { useChatPinnedMessageActions } from "./hooks/use-chat-pinned-message-actions"
import { useChatSearchShortcut } from "./hooks/use-chat-search-shortcut"
import { useChatSelectedFiles } from "./hooks/use-chat-selected-files"
import { useMessageReadStatus } from "./hooks/use-message-read-status"

export type { ChatAudioCallInput } from "./chat-page.context"
export { useChatPage } from "./chat-page.context"

export function ChatPageProvider({
    basePath,
    hrefBasePath = basePath,
    conversationId,
    sessionData,
    breadcrumbItemsPrefix = [],
    requestIntegration,
    onViewMemberProfile,
    onStartAudioCall,
    onNavigate,
    children,
}: ChatPageProviderProps) {
    const user = sessionData?.user
    const queryClient = useQueryClient()
    const resolvedInitialPageData = useMemo(
        () =>
            resolveInitialPageData({
                queryClient,
                userId: user?.id,
                scope: basePath,
                conversationId,
            }),
        [basePath, conversationId, queryClient, user?.id]
    )
    const [chatState, dispatch] = useReducer(
        chatReducer,
        resolvedInitialPageData,
        createInitialChatState
    )
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false)

    const {
        conversations,
        allMessages,
        isInitialLoading,
        isSubmitting,
        isUploadingFiles,
        isExporting,
        isSearchDialogOpen,
        isParticipantsDialogOpen,
        selectedFiles,
        replyingTo,
        editingMessage,
        deletingMessage,
    } = chatState

    const messageInputRef = useRef<HTMLTextAreaElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const stickToBottomContextRef = useRef<StickToBottomContext | null>(null)
    const highlightedMessageRef = useRef<HTMLElement | null>(null)
    const scrollToBottomRef = useRef<(() => void) | null>(null)

    const {
        messagePagination,
        messagePaginationRef,
        allMessagesRef,
        oldestLoadedHistoryOffsetRef,
        isSearchJumpingRef,
        isLoadingOlderMessages,
        loadOlderMessages,
        conversationLoadState,
        retryInitialLoad,
    } = useChatMessageHistory({
        conversationId,
        userId: user?.id,
        basePath,
        initialPageData: resolvedInitialPageData,
        allMessages,
        dispatch,
        stickToBottomContextRef,
    })

    const userMessageIds = useMemo(
        () => getUserMessageIds(allMessages, user?.id),
        [allMessages, user?.id]
    )

    const allMessageIds = useMemo(() => getReadStatusMessageIds(allMessages), [allMessages])

    const { shouldShowSeen, findMessageReaders, markConversationAsRead } = useMessageReadStatus({
        conversationId: conversationId || "",
        userId: user?.id || "",
        userMessageIds,
        allMessageIds,
        canReadConversation: conversationLoadState.canReadConversation,
    })
    const toggleConversationFavorite = useChatConversationPinActions({
        userId: user?.id,
        organizationId: sessionData?.session?.activeOrganizationId ?? undefined,
        conversationScope: basePath,
        onOptimisticChange: (targetConversationId, isPinned, pinnedAt) => {
            dispatch({
                type: "SET_CONVERSATION_PINNED_STATE",
                conversationId: targetConversationId,
                isPinned,
                pinnedAt,
            })
        },
    })

    const { startTyping, stopTyping, typingUsers } = useChatPageRealtime({
        conversationId,
        userId: user?.id,
        userName: user?.name,
        scope: basePath,
        allMessages,
        dispatch,
        markConversationAsRead,
        canReadConversation: conversationLoadState.canReadConversation,
    })

    useChatSearchShortcut({
        dispatch,
        isParticipantsDialogOpen,
        isSearchDialogOpen,
    })

    const {
        breadcrumbItems,
        currentConversation,
        displayMessages,
        isMac,
        participants,
        replyInputValue,
        typingUsersWithInfo,
    } = useChatPageDerivedState({
        allMessages,
        hrefBasePath,
        breadcrumbItemsPrefix,
        conversationId,
        conversations,
        isInitialLoading,
        replyingTo,
        typingUsers,
        userId: user?.id,
    })

    const {
        pinnedMessages,
        isPinnedMenuOpen,
        setIsPinnedMenuOpen,
        pinMessage,
        unpinMessage,
        openPinnedMessagesMenu,
    } = useChatPinnedMessageActions({
        conversationId,
        canReadConversation: conversationLoadState.canReadConversation,
        allMessagesRef,
        dispatch,
    })

    const {
        initiateMessageEdit,
        promptDeleteMessage,
        clearDeletingMessage,
        confirmDeleteMessage,
        saveMessageEdit,
    } = useChatMessageEditActions({
        deletingMessage,
        dispatch,
    })

    const { addSelectedFiles, removeSelectedFile } = useChatSelectedFiles({
        selectedFiles,
        dispatch,
        setShouldScrollToBottom,
    })

    const { scrollToMessage, replyToMessage, cancelReply } = useChatMessageNavigation({
        allMessages,
        dispatch,
        highlightedMessageRef,
        isSearchJumpingRef,
        messageInputRef,
        messagePaginationRef,
        oldestLoadedHistoryOffsetRef,
        scrollToBottomRef,
        stickToBottomContextRef,
        loadOlderMessages,
    })

    const setExporting = useCallback((exporting: boolean) => {
        dispatch({ type: "SET_EXPORTING", exporting })
    }, [])

    const exportConversation = useChatConversationExport({
        allMessages,
        currentConversation,
        setExporting,
    })

    const submitMessage = useChatMessageSubmit({
        conversationId,
        scope: basePath,
        selectedFiles,
        isSubmitting,
        currentUser: user,
        replyingTo,
        dispatch,
        highlightedMessageRef,
        messageInputRef,
    })

    const startAudioCall = useCallback(() => {
        const conv = currentConversation
        if (!conv || !conversationId || !user) return

        onStartAudioCall?.({
            conversationId,
            conversation: conv,
            currentUser: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image ?? null,
            },
        })
    }, [currentConversation, user, conversationId, onStartAudioCall])

    const viewMemberProfile = useMemo(
        () =>
            currentConversation?.isTeamChat && onViewMemberProfile
                ? (userId: string) => onViewMemberProfile(userId)
                : undefined,
        [currentConversation?.isTeamChat, onViewMemberProfile]
    )

    const { messageActions, messageMeta } = useChatMessageContextValues({
        currentConversation,
        initiateMessageEdit,
        onViewMemberProfile,
        openPinnedMessagesMenu,
        pinMessage,
        promptDeleteMessage,
        replyToMessage,
        requestIntegration,
        saveMessageEdit,
        sessionData,
        unpinMessage,
        userId: user?.id,
    })

    const openSearchDialog = useCallback(() => {
        dispatch({ type: "OPEN_SEARCH_DIALOG" })
    }, [])

    const closeSearchDialog = useCallback(() => {
        dispatch({ type: "CLOSE_SEARCH_DIALOG" })
    }, [])

    const openParticipantsDialog = useCallback(() => {
        dispatch({ type: "OPEN_PARTICIPANTS_DIALOG" })
    }, [])

    const closeParticipantsDialog = useCallback(() => {
        dispatch({ type: "CLOSE_PARTICIPANTS_DIALOG" })
    }, [])

    const state: ChatPageState = useMemo(
        () => ({
            conversations,
            allMessages,
            messagePagination,
            currentConversation,
            conversationLoadState,
            displayMessages,
            participants,
            pinnedMessages,
            typingUsersWithInfo,
            isInitialLoading,
            isLoadingOlderMessages,
            isPinnedMenuOpen,
            shouldScrollToBottom,
            isMac,
            messageActions,
            messageMeta,
            breadcrumbItems,
            selectedFiles,
            replyingTo,
            replyInputValue,
            editingMessage,
            deletingMessage,
            isSubmitting,
            isUploadingFiles,
            isExporting,
            isSearchDialogOpen,
            isParticipantsDialogOpen,
        }),
        [
            conversations,
            allMessages,
            messagePagination,
            currentConversation,
            conversationLoadState,
            displayMessages,
            participants,
            pinnedMessages,
            typingUsersWithInfo,
            isInitialLoading,
            isLoadingOlderMessages,
            isPinnedMenuOpen,
            shouldScrollToBottom,
            isMac,
            messageActions,
            messageMeta,
            breadcrumbItems,
            selectedFiles,
            replyingTo,
            replyInputValue,
            editingMessage,
            deletingMessage,
            isSubmitting,
            isUploadingFiles,
            isExporting,
            isSearchDialogOpen,
            isParticipantsDialogOpen,
        ]
    )

    const actions: ChatPageActions = useMemo(
        () => ({
            submitMessage,
            exportConversation,
            scrollToMessage,
            addSelectedFiles,
            removeSelectedFile,
            replyToMessage,
            cancelReply,
            initiateMessageEdit,
            promptDeleteMessage,
            confirmDeleteMessage,
            saveMessageEdit,
            pinMessage,
            unpinMessage,
            toggleConversationFavorite,
            startAudioCall,
            viewMemberProfile,
            startTyping,
            stopTyping,
            setIsPinnedMenuOpen,
            openSearchDialog,
            closeSearchDialog,
            openParticipantsDialog,
            closeParticipantsDialog,
            clearDeletingMessage,
            setShouldScrollToBottom,
            shouldShowSeen,
            findMessageReaders,
            loadOlderMessages,
            retryInitialLoad,
        }),
        [
            submitMessage,
            exportConversation,
            scrollToMessage,
            addSelectedFiles,
            removeSelectedFile,
            replyToMessage,
            cancelReply,
            initiateMessageEdit,
            promptDeleteMessage,
            confirmDeleteMessage,
            saveMessageEdit,
            pinMessage,
            unpinMessage,
            toggleConversationFavorite,
            startAudioCall,
            viewMemberProfile,
            startTyping,
            stopTyping,
            setIsPinnedMenuOpen,
            openSearchDialog,
            closeSearchDialog,
            openParticipantsDialog,
            closeParticipantsDialog,
            clearDeletingMessage,
            shouldShowSeen,
            findMessageReaders,
            loadOlderMessages,
            retryInitialLoad,
        ]
    )

    const refs: ChatPageRefs = useMemo(
        () => ({
            scrollContainerRef,
            stickToBottomContextRef,
            messageInputRef,
            scrollToBottomRef,
        }),
        []
    )

    const metaValue: ChatPageMeta = useMemo(
        () => ({
            userId: user?.id ?? "",
            conversationId,
            chatsHref: `${hrefBasePath}/chats`,
            onNavigate,
            refs,
        }),
        [hrefBasePath, user?.id, conversationId, onNavigate, refs]
    )

    const contextValue: ChatPageContextValue = useMemo(
        () => ({
            state,
            actions,
            meta: metaValue,
        }),
        [state, actions, metaValue]
    )

    return <ChatPageContext value={contextValue}>{children}</ChatPageContext>
}

function resolveInitialPageData({
    queryClient,
    userId,
    scope,
    conversationId,
}: {
    queryClient: QueryClient
    userId: string | undefined
    scope: string
    conversationId: string | undefined
}): InitialChatPageData | null {
    if (!userId || !conversationId) return null

    const messagesPage = queryClient.getQueryData<InitialChatPageData["messagesPage"]>(
        chatKeys.messagesPage({
            userId,
            scope,
            conversationId,
            limit: MESSAGE_PAGE_LIMIT,
            offset: 0,
        })
    )
    const conversationsPage = queryClient.getQueryData<InitialChatPageData["conversationsPage"]>(
        chatKeys.initialConversationsPage({
            userId,
            scope,
            limit: CONVERSATIONS_PAGE_LIMIT,
            offset: 0,
        })
    )

    if (!messagesPage || !conversationsPage) return null

    return {
        userId,
        scope,
        conversationId,
        messagesPage,
        conversationsPage,
    }
}

function createInitialChatState(initialPageData: InitialChatPageData | null): ChatState {
    if (!initialPageData) return initialChatState

    const { messages, conversations } = readInitialChatPageData(initialPageData)

    return {
        ...initialChatState,
        conversations,
        allMessages: messages,
        isInitialLoading: false,
    }
}
