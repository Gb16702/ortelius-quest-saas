import { Link } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, Star } from "lucide-react"
import { type MouseEvent, memo, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PresenceIndicator } from "@/entities/presence"
import { cn } from "@/shared/lib/class-names"
import { getDateFnsLocale } from "@/shared/lib/i18n/date-fns-locale"
import { formatSenderName } from "@/shared/lib/name"
import { AvatarGroup, type AvatarGroupMember } from "@/shared/ui/avatar-group"
import { Button } from "@/shared/ui/button"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip"
import { formatChatSystemEvent } from "../lib/chat-system-event"
import { normalizeConversationDisplayName } from "../lib/conversation-display"
import { useChatConversationPrefetch } from "../model/hooks/use-chat-conversation-prefetch"
import { useTypingListener } from "../model/hooks/use-web-socket-message"

interface LastMessage {
    id?: string
    content: string
    messageType?: string
    senderId: string
    senderName?: string
    createdAt: string
    isUnread?: boolean
    metadata?: {
        attachments?: Array<{
            id: string
            filename: string
            originalName: string
            mimeType: string
        }>
        systemEventKey?: string
        systemEventParams?: Record<string, unknown>
    }
}

interface ContextInfo {
    type: "organization" | "user"
    id: string | null
    name: string
    logo?: string | null
    image?: string | null
    email?: string | null
}

interface Participant {
    id: string
    name: string
    image?: string | null
}

interface ConversationListCardProps {
    id: string
    name: string
    lastMessage?: LastMessage | null
    messageCount?: number
    participants?: Participant[]
    updatedAt: string
    contextInfo?: ContextInfo | null
    isActive?: boolean
    className?: string
    isTeamChat?: boolean
    isPinned?: boolean
    pinnedAt?: string | null
    onPinToggle?: (conversationId: string, nextValue: boolean, currentValue: boolean) => void
    basePath: string
    hrefBasePath: string
    currentUserId: string
}

// biome-ignore lint/style/useComponentExportOnlyModules: base component is intentionally private; only the memo'd ConversationListCard is exported
function ConversationListCardBase({
    id,
    name,
    lastMessage,
    messageCount,
    participants = [],
    contextInfo,
    className,
    isTeamChat = false,
    isPinned = false,
    onPinToggle,
    basePath,
    hrefBasePath,
    currentUserId,
}: ConversationListCardProps) {
    const { i18n, t } = useTranslation("chat")
    const conversationHref = `${hrefBasePath}/chat/${id}`

    const typingUsers = useTypingListener(id)
    const { prefetchConversation, prefetchConversationNow, cancelConversationPrefetch } =
        useChatConversationPrefetch({
            userId: currentUserId,
            scope: basePath,
            conversationId: id,
        })

    const otherUsersTyping = useMemo(
        () => typingUsers.filter((tu) => tu.userId !== currentUserId),
        [typingUsers, currentUserId]
    )

    const avatarSrc = contextInfo?.type === "user" ? contextInfo?.image : contextInfo?.logo
    const displayName = normalizeConversationDisplayName(name)
    const avatarFallback = normalizeConversationDisplayName(contextInfo?.name || name)

    const hasUnread = lastMessage?.isUnread
    const isGuest = contextInfo?.type === "user" && contextInfo?.id === null

    const avatarMembers: AvatarGroupMember[] = useMemo(
        () =>
            participants.map((p) => ({
                id: p.id,
                name: p.name,
                image: p.image,
                tooltip: p.name,
            })),
        [participants]
    )

    const resolveMemberName = useCallback(
        (userId: string, fallbackName?: string) => {
            if (fallbackName) return fallbackName

            const participant = participants.find((p) => p.id === userId)
            if (participant) return participant.name

            if (contextInfo?.id === userId) return contextInfo.name

            return t("message.someone")
        },
        [participants, contextInfo, t]
    )

    const formatTypingIndicatorText = useCallback(() => {
        if (otherUsersTyping.length === 0) return null

        if (otherUsersTyping.length === 1) {
            const userName = resolveMemberName(
                otherUsersTyping[0].userId,
                otherUsersTyping[0].userName
            )
            return t("card.typingOne", { name: formatSenderName(userName) })
        }

        if (otherUsersTyping.length === 2) {
            const name1 = formatSenderName(
                resolveMemberName(otherUsersTyping[0].userId, otherUsersTyping[0].userName)
            )
            const name2 = formatSenderName(
                resolveMemberName(otherUsersTyping[1].userId, otherUsersTyping[1].userName)
            )
            return t("card.typingTwo", { name1, name2 })
        }

        return t("card.typingMany", { count: otherUsersTyping.length })
    }, [otherUsersTyping, resolveMemberName, t])

    const formatMessagePreview = useCallback(() => {
        if (!lastMessage) return null

        const attachments = lastMessage.metadata?.attachments
        const hasAttachments = attachments && attachments.length > 0

        if (hasAttachments) {
            const fileCount = attachments.length
            return fileCount === 1
                ? t("card.sharedAFile")
                : t("card.sharedFiles", { count: fileCount })
        }

        if (lastMessage.messageType === "system") {
            return formatChatSystemEvent({
                content: lastMessage.content,
                metadata: lastMessage.metadata,
                t,
            })
        }

        return lastMessage.content
    }, [lastMessage, t])

    const favoriteToggleLabel = isPinned
        ? t("card.removeFavorite", { defaultValue: "Remove favorite" })
        : t("card.addFavorite", { defaultValue: "Add favorite" })
    const conversationTitle = isTeamChat ? t("card.teamChat") : displayName
    const messagePreview = formatMessagePreview()
    const typingIndicatorText = formatTypingIndicatorText()

    const togglePin = useCallback(
        (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()

            onPinToggle?.(id, !isPinned, isPinned)
        },
        [id, isPinned, onPinToggle]
    )

    return (
        <div
            className={cn(
                "group relative block rounded-lg p-4 shadow-control transition-all hover:shadow-control-hover active:shadow-control-active",
                className
            )}
        >
            <Link
                to={conversationHref}
                preload="intent"
                className="block"
                onPointerDown={prefetchConversationNow}
                onMouseEnter={prefetchConversation}
                onMouseLeave={cancelConversationPrefetch}
                onFocus={prefetchConversation}
                onBlur={cancelConversationPrefetch}
            >
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                            <GeneratedAvatar
                                src={avatarSrc}
                                fallbackText={avatarFallback}
                                alt={`${displayName} avatar`}
                                size="md"
                            />
                            {!isTeamChat && contextInfo?.type === "user" && contextInfo?.id && (
                                <PresenceIndicator
                                    userId={contextInfo.id}
                                    size="md"
                                    className="absolute -right-0.5 -bottom-0.5"
                                    showOffline
                                />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-col gap-1">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <h3
                                            className="block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-medium text-ds-fg text-sm"
                                            title={conversationTitle}
                                        >
                                            {conversationTitle}
                                        </h3>

                                        {isGuest && (
                                            <span className="flex-shrink-0 text-ds-fg-subtle text-xs">
                                                {t("guestBadge.label", { ns: "common" })}
                                            </span>
                                        )}
                                    </div>
                                    {(messagePreview || otherUsersTyping.length > 0) && (
                                        <div className="flex min-w-0 items-center gap-2">
                                            {hasUnread && !otherUsersTyping.length && (
                                                <div className="size-2 flex-shrink-0 rounded-full bg-ds-accent-700" />
                                            )}
                                            <p
                                                className={cn(
                                                    "line-clamp-1 min-w-0 text-sm",
                                                    hasUnread
                                                        ? "font-medium text-ds-fg"
                                                        : "text-ds-fg-muted"
                                                )}
                                            >
                                                {otherUsersTyping.length > 0 ? (
                                                    <span>{typingIndicatorText}</span>
                                                ) : (
                                                    <>
                                                        {lastMessage?.messageType !== "system" &&
                                                            lastMessage?.senderName && (
                                                                <span>
                                                                    ~{" "}
                                                                    {formatSenderName(
                                                                        lastMessage.senderName
                                                                    )}{" "}
                                                                </span>
                                                            )}
                                                        <span>{messagePreview}</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                                    {lastMessage && (
                                        <span className={"text-ds-fg-subtle text-xs"}>
                                            {formatDistanceToNow(new Date(lastMessage.createdAt), {
                                                addSuffix: true,
                                                locale: getDateFnsLocale(i18n.language),
                                            })}
                                        </span>
                                    )}
                                    {(avatarMembers.length > 0 ||
                                        (messageCount !== undefined && messageCount > 0)) && (
                                        <div className="flex items-center gap-2">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            onClick={togglePin}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-6"
                                                            aria-label={favoriteToggleLabel}
                                                        >
                                                            <Star
                                                                className="size-3.5 text-ds-fg-muted"
                                                                fill={
                                                                    isPinned
                                                                        ? "currentColor"
                                                                        : "none"
                                                                }
                                                            />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{favoriteToggleLabel}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {messageCount !== undefined && messageCount > 0 && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-1">
                                                                <MessageSquare className="size-3.5 text-ds-fg-muted" />
                                                                <span className="font-medium font-mono text-ds-fg-muted text-xs tracking-tight">
                                                                    {messageCount}
                                                                </span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>
                                                                {t("card.messagesSentSuffix", {
                                                                    label:
                                                                        messageCount === 1
                                                                            ? t("card.oneMessage")
                                                                            : t(
                                                                                  "card.manyMessages",
                                                                                  {
                                                                                      count: messageCount,
                                                                                  }
                                                                              ),
                                                                })}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            {avatarMembers.length > 0 && (
                                                <AvatarGroup
                                                    members={avatarMembers}
                                                    size="sm"
                                                    limit={5}
                                                    overlap={true}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    )
}

export const ConversationListCard = memo(ConversationListCardBase, (prevProps, nextProps) => {
    return (
        prevProps.id === nextProps.id &&
        prevProps.name === nextProps.name &&
        prevProps.messageCount === nextProps.messageCount &&
        prevProps.lastMessage?.id === nextProps.lastMessage?.id &&
        prevProps.lastMessage?.content === nextProps.lastMessage?.content &&
        prevProps.lastMessage?.messageType === nextProps.lastMessage?.messageType &&
        prevProps.lastMessage?.isUnread === nextProps.lastMessage?.isUnread &&
        prevProps.participants?.length === nextProps.participants?.length &&
        prevProps.isTeamChat === nextProps.isTeamChat &&
        prevProps.isPinned === nextProps.isPinned &&
        prevProps.pinnedAt === nextProps.pinnedAt &&
        prevProps.basePath === nextProps.basePath &&
        prevProps.hrefBasePath === nextProps.hrefBasePath &&
        prevProps.currentUserId === nextProps.currentUserId
    )
})
