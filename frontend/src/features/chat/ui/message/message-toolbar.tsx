import { Pencil, Pin, PinOff, Reply, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { useMessage } from "./message.context"
import { useMessageEdit } from "./message-edit.context"

interface MessageToolbarProps {
    isHovered: boolean
}

export const MessageToolbar = ({ isHovered }: MessageToolbarProps) => {
    const { t } = useTranslation("chat")
    const { state, actions, permissions } = useMessage()
    const { isEditMode, enterEditMode } = useMessageEdit()

    const { canReply, canEdit, canDelete, canPin, canUnpin } = permissions

    if (!isHovered || isEditMode || !(canReply || canEdit || canDelete || canPin || canUnpin)) {
        return null
    }

    const replyToMessage = () => {
        actions.onReply?.(state.id, state.content, permissions.senderName)
    }

    const deleteMessage = () => {
        actions.onDelete?.(
            state.id,
            state.content,
            permissions.senderName,
            state.senderInfo?.image,
            state.createdAt
        )
    }

    return (
        <div className="absolute top-0 right-0">
            <ButtonGroup className="pointer-events-auto [&_a:hover]:border-ds-surface-border [&_button:hover]:border-ds-surface-border">
                {canReply && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                radius="full"
                                variant="outline"
                                size="xs"
                                aria-label={t("toolbar.ariaReply")}
                                onClick={replyToMessage}
                            >
                                <Reply className="size-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("toolbar.reply")}</TooltipContent>
                    </Tooltip>
                )}
                {canPin && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                radius="full"
                                variant="outline"
                                size="xs"
                                aria-label={t("toolbar.ariaPin")}
                                onClick={() => actions.onPin?.(state.id)}
                            >
                                <Pin className="size-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("toolbar.pin")}</TooltipContent>
                    </Tooltip>
                )}
                {canUnpin && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                radius="full"
                                variant="outline"
                                size="xs"
                                aria-label={t("toolbar.ariaUnpin")}
                                onClick={() => actions.onUnpin?.(state.id)}
                            >
                                <PinOff className="size-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("toolbar.unpin")}</TooltipContent>
                    </Tooltip>
                )}
                {canEdit && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                radius="full"
                                variant="outline"
                                size="xs"
                                aria-label={t("toolbar.ariaEdit")}
                                onClick={enterEditMode}
                            >
                                <Pencil className="size-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("toolbar.edit")}</TooltipContent>
                    </Tooltip>
                )}
                {canDelete && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                radius="full"
                                variant="outline"
                                size="xs"
                                aria-label={t("toolbar.ariaDelete")}
                                onClick={deleteMessage}
                            >
                                <Trash2 className="size-3.5 text-red-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("toolbar.delete")}</TooltipContent>
                    </Tooltip>
                )}
            </ButtonGroup>
        </div>
    )
}
