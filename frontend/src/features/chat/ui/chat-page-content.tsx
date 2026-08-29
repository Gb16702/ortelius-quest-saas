import { useCallback, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { StickToBottom } from "use-stick-to-bottom"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Skeleton } from "@/shared/ui/skeleton"
import { Spinner } from "@/shared/ui/spinner"
import { getConversationDisplayName } from "../lib/conversation-display"
import { useChatPage } from "../model/chat-page.provider"
import { ChatConversationLoadState } from "./chat-conversation-load-state"
import { ChatHeaderActions } from "./chat-header-actions"
import { ChatMessageList } from "./chat-message-list"
import { DeleteMessageDialog } from "./delete-message-dialog"
import { MessageInput } from "./message-input"
import { MessageSearchDialog } from "./message-search-dialog"
import { MessagesLoadingSkeleton } from "./message-skeleton"
import { ParticipantsDialog } from "./participants-dialog"
import { ScrollToBottomButton } from "./scroll-to-bottom-button"
import { TypingBubble } from "./typing-bubble"

export function ChatPageContent() {
    const { t } = useTranslation("chat")
    const { state, actions, meta } = useChatPage()
    const { refs } = meta
    const loadOlderSentinelRef = useRef<HTMLDivElement>(null)
    const hasLeftInitialTopRef = useRef(false)
    const requestedOlderLoadRef = useRef(false)
    const previousConversationIdRef = useRef(meta.conversationId)
    const {
        currentConversation,
        conversationLoadState,
        isInitialLoading,
        isSubmitting,
        isUploadingFiles,
        isSearchDialogOpen,
        isParticipantsDialogOpen,
        selectedFiles,
        replyingTo,
        replyInputValue,
        typingUsersWithInfo,
        breadcrumbItems,
        participants,
        messagePagination,
        isLoadingOlderMessages,
        deletingMessage,
    } = state

    const breadcrumbItemsWithSkeleton = breadcrumbItems.map((item, index) => {
        if (index !== breadcrumbItems.length - 1) {
            return item
        }

        return {
            ...item,
            label: isInitialLoading ? <Skeleton className="h-4 w-32" /> : item.label,
        }
    })

    if (previousConversationIdRef.current !== meta.conversationId) {
        hasLeftInitialTopRef.current = false
        requestedOlderLoadRef.current = false
        previousConversationIdRef.current = meta.conversationId
    }

    const requestOlderMessages = useCallback(() => {
        if (requestedOlderLoadRef.current || isLoadingOlderMessages) return

        requestedOlderLoadRef.current = true
        void actions.loadOlderMessages().finally(() => {
            requestedOlderLoadRef.current = false
        })
    }, [actions.loadOlderMessages, isLoadingOlderMessages])

    const preloadSearchDialog = useCallback(() => {
        return undefined
    }, [])

    const preloadParticipantsDialog = useCallback(() => {
        return undefined
    }, [])

    useEffect(() => {
        if (isInitialLoading) return

        const scrollRoot = refs.stickToBottomContextRef.current?.scrollRef.current
        if (!scrollRoot) return

        if (scrollRoot.scrollTop > 80) {
            hasLeftInitialTopRef.current = true
        }

        const onScroll = () => {
            if (scrollRoot.scrollTop > 80) {
                hasLeftInitialTopRef.current = true
            }

            if (
                hasLeftInitialTopRef.current &&
                messagePagination.hasMore &&
                !isLoadingOlderMessages &&
                scrollRoot.scrollTop <= 160
            ) {
                requestOlderMessages()
            }
        }

        scrollRoot.addEventListener("scroll", onScroll, { passive: true })
        return () => {
            scrollRoot.removeEventListener("scroll", onScroll)
        }
    }, [
        isInitialLoading,
        isLoadingOlderMessages,
        messagePagination.hasMore,
        requestOlderMessages,
        refs.stickToBottomContextRef,
    ])

    useEffect(() => {
        if (
            isInitialLoading ||
            !messagePagination.hasMore ||
            typeof IntersectionObserver === "undefined"
        )
            return

        const sentinel = loadOlderSentinelRef.current
        const scrollRoot = refs.stickToBottomContextRef.current?.scrollRef.current
        if (!sentinel || !scrollRoot) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (
                    entry?.isIntersecting &&
                    !isLoadingOlderMessages &&
                    hasLeftInitialTopRef.current
                ) {
                    requestOlderMessages()
                }
            },
            {
                root: scrollRoot,
                rootMargin: "240px 0px 0px 0px",
                threshold: 0,
            }
        )

        observer.observe(sentinel)

        return () => {
            observer.disconnect()
        }
    }, [
        isInitialLoading,
        isLoadingOlderMessages,
        messagePagination.hasMore,
        requestOlderMessages,
        refs.stickToBottomContextRef,
    ])

    if (
        conversationLoadState.status === "forbidden" ||
        conversationLoadState.status === "not-found" ||
        conversationLoadState.status === "error"
    ) {
        return (
            <div className="relative flex h-full w-full flex-col">
                <BreadcrumbNav items={breadcrumbItemsWithSkeleton} />
                <div className="flex flex-1 items-center justify-center bg-ds-surface">
                    <ChatConversationLoadState
                        status={conversationLoadState.status}
                        chatsHref={meta.chatsHref}
                        onNavigate={meta.onNavigate}
                        onRetry={actions.retryInitialLoad}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex h-full w-full flex-col">
            <BreadcrumbNav
                items={breadcrumbItemsWithSkeleton}
                actions={
                    <ChatHeaderActions
                        onParticipantsDialogIntent={preloadParticipantsDialog}
                        onSearchDialogIntent={preloadSearchDialog}
                    />
                }
            />
            <StickToBottom
                contextRef={refs.stickToBottomContextRef}
                className="scroll-mask-y relative flex-1 touch-pan-y overflow-y-auto bg-ds-surface will-change-scroll"
                initial="instant"
                resize="instant"
            >
                <StickToBottom.Content
                    className={`mx-auto w-full max-w-5xl space-y-10 ${
                        selectedFiles.length > 0
                            ? replyingTo
                                ? "pb-[280px]"
                                : "pb-60"
                            : replyingTo
                              ? "pb-[216px]"
                              : "pb-44"
                    }`}
                >
                    {isInitialLoading ? (
                        <MessagesLoadingSkeleton />
                    ) : (
                        <>
                            {messagePagination.hasMore && (
                                <div
                                    ref={loadOlderSentinelRef}
                                    className="flex min-h-8 justify-center px-4 sm:px-6 lg:px-10"
                                >
                                    {isLoadingOlderMessages ? (
                                        <div className="inline-flex h-7 items-center gap-1.5 rounded-full border border-ds-surface-border bg-ds-surface px-3 font-medium text-ds-fg-muted text-xs">
                                            <Spinner className="size-3.5" />
                                            {t("messageList.loadingEarlier")}
                                        </div>
                                    ) : (
                                        <span className="sr-only">
                                            {t("messageList.loadEarlier")}
                                        </span>
                                    )}
                                </div>
                            )}
                            <ChatMessageList />
                            {typingUsersWithInfo.length > 0 && (
                                <div className="px-4 sm:px-6 lg:px-10">
                                    <div className="px-14">
                                        {typingUsersWithInfo.map((typingUserInfo) => (
                                            <TypingBubble
                                                key={`typing-${typingUserInfo.id}`}
                                                senderInfo={typingUserInfo}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </StickToBottom.Content>
                <ScrollToBottomButton />
            </StickToBottom>

            <div className="absolute right-0 bottom-0 left-0 z-50 bg-transparent">
                <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
                    <div className="space-y-2 px-14 pb-4">
                        <MessageInput
                            autoFocus={true}
                            ref={refs.messageInputRef}
                            maxlength={5000}
                            placeholder={
                                currentConversation
                                    ? t("input.placeholderTo", {
                                          name: getConversationDisplayName(currentConversation),
                                      })
                                    : t("input.placeholder")
                            }
                            onSubmit={actions.submitMessage}
                            onFilesSelected={actions.addSelectedFiles}
                            onRemoveFile={actions.removeSelectedFile}
                            selectedFiles={selectedFiles}
                            disabled={isSubmitting || isUploadingFiles}
                            isSubmitting={isSubmitting || isUploadingFiles}
                            onTyping={actions.startTyping}
                            onStopTyping={actions.stopTyping}
                            replyingTo={replyInputValue}
                            onCancelReply={actions.cancelReply}
                            participants={participants}
                            currentUserId={meta.userId}
                            enableMentions={currentConversation?.isTeamChat}
                            canMentionRoles={currentConversation?.isTeamChat}
                        />
                    </div>
                </div>
            </div>

            {isSearchDialogOpen && (
                <MessageSearchDialog
                    isOpen={true}
                    onClose={actions.closeSearchDialog}
                    conversationId={meta.conversationId || ""}
                    onMessageClick={(message) => actions.scrollToMessage(message.id, message)}
                />
            )}

            {isParticipantsDialogOpen && (
                <ParticipantsDialog
                    isOpen={true}
                    onClose={actions.closeParticipantsDialog}
                    participants={participants}
                    conversationId={meta.conversationId || undefined}
                    onViewProfile={actions.viewMemberProfile}
                />
            )}

            {deletingMessage && <DeleteMessageDialog />}
        </div>
    )
}
