import { Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatTime } from "@/shared/lib/date"
import { Badge } from "@/shared/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { useMessage } from "./message.context"

export const MessageHeader = () => {
    const { t } = useTranslation("chat")
    const { state, actions, permissions } = useMessage()

    if (!state.hasAvatar) return null

    const renderTimeOrClock = () => {
        if (state.isOptimistic) {
            return <Clock className="size-3 text-ds-fg-muted" />
        }
        return (
            <span className="text-ds-fg-muted text-xs">
                {formatTime(new Date(state.createdAt))}
            </span>
        )
    }

    return (
        <div className="mb-3 flex items-baseline gap-3">
            <div className="flex items-center gap-2">
                {!permissions.isOwnMessage &&
                permissions.viewerInSameOrg &&
                actions.onViewProfile ? (
                    <button
                        type="button"
                        onClick={() => actions.onViewProfile?.(state.senderId)}
                        className="cursor-pointer font-semibold text-sm hover:underline"
                    >
                        {permissions.senderName}
                    </button>
                ) : (
                    <span className="font-semibold text-sm">{permissions.senderName}</span>
                )}
                {state.organizationName && !permissions.isOwnMessage && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="accent" size="sm">
                                {state.organizationName}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="flex items-center gap-2">
                                <span>
                                    {t("message.partOfOrg", {
                                        organization: state.organizationName,
                                    })}
                                </span>
                                {permissions.viewerInSameOrg && actions.onViewProfile && (
                                    <button
                                        type="button"
                                        onClick={() => actions.onViewProfile?.(state.senderId)}
                                        className="cursor-pointer text-white underline"
                                    >
                                        {t("message.viewProfile")}
                                    </button>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}
                {state.organizationName && permissions.isOwnMessage && (
                    <Badge variant="accent" size="sm">
                        {state.organizationName}
                    </Badge>
                )}
            </div>
            {renderTimeOrClock()}
        </div>
    )
}
