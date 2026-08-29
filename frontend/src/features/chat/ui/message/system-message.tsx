import { Check, CloudDownload, Info, Pin } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { formatTime } from "@/shared/lib/date"
import { Alert, AlertTitle } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import { Spinner } from "@/shared/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { formatChatSystemEvent } from "../../lib/chat-system-event"
import { useMessage } from "./message.context"

export const SystemMessage = () => {
    const { t } = useTranslation("chat")
    const { state, actions, meta } = useMessage()
    const systemEventTitle = formatChatSystemEvent({
        content: state.content,
        metadata: state.metadata,
        t,
    })
    const canViewRequest = meta.requestId && meta.requestNumber && meta.requestIntegration
    const [isDownloading, setIsDownloading] = useState(false)
    const [isViewingRequest, setIsViewingRequest] = useState(false)

    const viewRequest = () => {
        if (!meta.requestNumber || !meta.requestIntegration) return
        setIsViewingRequest(true)
        const fromOrganizationConversation = meta.conversationType !== "requester"

        meta.requestIntegration.openRequest(meta.requestNumber, {
            fromTeamChat: fromOrganizationConversation,
            teamChatOrganizationId: fromOrganizationConversation
                ? meta.conversationOrganizationId
                : null,
        })
    }

    const handleDownloadPdf = async () => {
        if (!meta.requestId || !meta.requestNumber || !meta.requestIntegration) return
        setIsDownloading(true)
        await meta.requestIntegration.downloadPdf(meta.requestId, meta.requestNumber)
        setTimeout(() => {
            setIsDownloading(false)
        }, 3000)
    }

    useEffect(() => {
        if (
            meta.requestNumber &&
            meta.requestIntegration?.isRequestOpen(meta.requestNumber) &&
            isViewingRequest
        ) {
            setIsViewingRequest(false)
        }
    }, [isViewingRequest, meta.requestIntegration, meta.requestNumber])

    if (state.metadata?.type === "request_shared" && meta.requestId && meta.requestNumber) {
        const sharedRequest = meta.requestIntegration?.renderSharedRequest?.({
            id: state.id,
            content: systemEventTitle,
            createdAt: state.createdAt,
            requestNumber: meta.requestNumber,
            isTeamChat: meta.isTeamChat,
            conversationType: meta.conversationType,
            userId: meta.userId,
            userOrganizationId: meta.userOrganizationId,
            conversationOrganizationId: meta.conversationOrganizationId,
            isViewingRequest,
            onViewRequest: viewRequest,
        })

        if (sharedRequest) return sharedRequest
    }

    if (state.metadata?.type === "message_pinned") {
        return (
            <div className="flex w-full gap-4 py-1" data-message-id={state.id}>
                <Pin className="size-4 self-center text-ds-fg-muted" />
                <div className="flex items-baseline gap-3">
                    <p className="m-0 text-ds-fg-muted text-sm">
                        <span className="font-medium text-ds-fg">
                            {state.metadata.pinnedByName}
                        </span>{" "}
                        {t("pinned.pinnedByPrefix")}{" "}
                        <span className="font-medium text-ds-fg">{t("pinned.aMessage")}</span>{" "}
                        {t("pinned.toThisChannel")}{" "}
                        {actions.onViewPinnedMessages && (
                            <button
                                type="button"
                                onClick={actions.onViewPinnedMessages}
                                className="font-medium text-ds-fg hover:underline"
                            >
                                {t("pinned.viewAll")}
                            </button>
                        )}
                    </p>
                    <span className="text-ds-fg-subtle text-xs">
                        {formatTime(new Date(state.createdAt))}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full" data-message-id={state.id}>
            <Alert className="bg-ds-surface py-4">
                <Info className="h-4 w-4" />
                <div className="space-y-2">
                    <div className="m-0 flex items-start justify-between">
                        <AlertTitle className="font-medium text-sm">{systemEventTitle}</AlertTitle>
                        {canViewRequest && (
                            <ButtonGroup className="pointer-events-auto ml-4 [&_a:hover]:border-ds-surface-border [&_button:hover]:border-ds-surface-border">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            radius="full"
                                            size="sm"
                                            onClick={handleDownloadPdf}
                                            disabled={isDownloading}
                                        >
                                            {isDownloading ? (
                                                <Check width={24} height={24} />
                                            ) : (
                                                <CloudDownload width={24} height={24} />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {t("systemMessage.downloadPdf")}
                                    </TooltipContent>
                                </Tooltip>
                                <Button
                                    variant="outline"
                                    radius="full"
                                    size="sm"
                                    onClick={viewRequest}
                                    disabled={isViewingRequest}
                                >
                                    {isViewingRequest ? (
                                        <Spinner />
                                    ) : (
                                        t("systemMessage.openRequest")
                                    )}
                                </Button>
                            </ButtonGroup>
                        )}
                    </div>
                    <p className="text-gray-500 text-xs">{formatTime(new Date(state.createdAt))}</p>
                </div>
            </Alert>
        </div>
    )
}
