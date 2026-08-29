import { Download, MoreHorizontal, Phone, Pin, Search, Star, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Skeleton } from "@/shared/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { useChatPage } from "../model/chat-page.provider"
import { PinnedMessagesMenuContent } from "./pinned-messages-menu"

interface ChatHeaderActionsProps {
    onParticipantsDialogIntent?: () => void
    onSearchDialogIntent?: () => void
}

export function ChatHeaderActions({
    onParticipantsDialogIntent,
    onSearchDialogIntent,
}: ChatHeaderActionsProps) {
    const { t } = useTranslation("chat")
    const { state, actions, meta } = useChatPage()
    const { currentConversation, isExporting, isInitialLoading, allMessages } = state
    const isConversationFavorited = currentConversation?.isPinned ?? false
    const favoriteLabel = isConversationFavorited
        ? t("card.removeFavorite", { defaultValue: "Remove favorite" })
        : t("card.addFavorite", { defaultValue: "Add favorite" })

    if (!meta.conversationId) {
        return null
    }

    if (isInitialLoading) {
        return (
            <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-sm" />
                <Skeleton className="h-8 w-[170px] rounded-sm" />
                <Skeleton className="size-8 rounded-sm" />
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1.5">
            {currentConversation && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={() =>
                                actions.toggleConversationFavorite(
                                    currentConversation,
                                    !isConversationFavorited,
                                    isConversationFavorited
                                )
                            }
                            size="icon-sm"
                            radius="full"
                            variant="ghost"
                            className={
                                isConversationFavorited
                                    ? "text-ds-fg hover:text-ds-fg"
                                    : "text-ds-fg-muted hover:text-ds-fg"
                            }
                            aria-label={favoriteLabel}
                        >
                            <Star
                                className="size-4"
                                fill={isConversationFavorited ? "currentColor" : "none"}
                            />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{favoriteLabel}</TooltipContent>
                </Tooltip>
            )}
            <Button
                onClick={() => {
                    onSearchDialogIntent?.()
                    actions.openSearchDialog()
                }}
                onFocus={onSearchDialogIntent}
                onPointerDown={onSearchDialogIntent}
                onPointerEnter={onSearchDialogIntent}
                size="icon-sm"
                radius="full"
                variant="ghost"
                className="text-ds-fg-muted hover:text-ds-fg"
                aria-label={t("header.search")}
                title={t("header.search")}
            >
                <Search className="size-4" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="icon-sm"
                        radius="full"
                        variant="ghost"
                        className="text-ds-fg-muted hover:text-ds-fg"
                        disabled={isExporting}
                        onFocus={onParticipantsDialogIntent}
                        onPointerDown={onParticipantsDialogIntent}
                        onPointerEnter={onParticipantsDialogIntent}
                        aria-label={t("header.moreActions", { defaultValue: "More actions" })}
                        title={t("header.moreActions", { defaultValue: "More actions" })}
                    >
                        <MoreHorizontal className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {!currentConversation?.isTeamChat && (
                        <DropdownMenuItem size="xs" onClick={actions.startAudioCall}>
                            <Phone className="size-4" />
                            {t("header.startAudioCall", { defaultValue: "Start audio call" })}
                        </DropdownMenuItem>
                    )}
                    {currentConversation?.isTeamChat && (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger size="xs">
                                <Pin className="size-4" />
                                {t("pinned.viewAll")}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-72">
                                <PinnedMessagesMenuContent />
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}
                    <DropdownMenuItem
                        size="xs"
                        onClick={() => {
                            onParticipantsDialogIntent?.()
                            actions.openParticipantsDialog()
                        }}
                        onFocus={onParticipantsDialogIntent}
                        onPointerDown={onParticipantsDialogIntent}
                        onPointerEnter={onParticipantsDialogIntent}
                    >
                        <Users className="size-4" />
                        {t("header.viewParticipants")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        size="xs"
                        onClick={actions.exportConversation}
                        disabled={isExporting || allMessages.length === 0}
                    >
                        <Download className="size-4" />
                        {isExporting ? t("header.exporting") : t("header.exportCsv")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
