import { Calendar, CircleDashed, CornerDownRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PresenceIndicator } from "@/entities/presence"
import { RequestStatusDisplay } from "@/entities/request"
import { generateAvatarUrl } from "@/shared/lib/avatar"
import { Avatar, AvatarImage } from "@/shared/ui/avatar"
import { Spinner } from "@/shared/ui/spinner"
import {
    createRequestScopeKey,
    type RequestScopeKey,
    useRequestByNumber,
} from "../api/requests.api"
import { PriorityBars } from "./priority-bars"

type SharedRequestConversationType = "team" | "member_dm" | "requester"

interface ChatSharedRequestCardProps {
    id: string
    content: string
    createdAt: string
    requestNumber: string
    isTeamChat: boolean
    conversationType: SharedRequestConversationType
    userId: string
    userOrganizationId?: string | null
    conversationOrganizationId?: string | null
    isViewingRequest: boolean
    onViewRequest: () => void
}

function formatDateShort(date: string | Date, locale: string): string {
    const d = new Date(date)
    return d.toLocaleDateString(locale, { month: "short", day: "numeric" })
}

function createSharedRequestScope({
    isTeamChat,
    conversationType,
    conversationOrganizationId,
    userId,
}: {
    isTeamChat: boolean
    conversationType: SharedRequestConversationType
    conversationOrganizationId?: string | null
    userId: string
}): RequestScopeKey {
    const requestScope =
        isTeamChat || conversationType === "member_dm"
            ? createRequestScopeKey({
                  scope: "organization",
                  organizationId: conversationOrganizationId,
              })
            : createRequestScopeKey({ scope: "personal", userId })

    if (!requestScope) {
        throw new Error("Shared request scope is missing")
    }

    return requestScope
}

export function ChatSharedRequestCard({
    id,
    content,
    requestNumber,
    isTeamChat,
    conversationType,
    userId,
    conversationOrganizationId,
    isViewingRequest,
    onViewRequest,
}: ChatSharedRequestCardProps) {
    const { i18n, t } = useTranslation("requests")
    const requestScope = createSharedRequestScope({
        isTeamChat,
        conversationType,
        conversationOrganizationId,
        userId,
    })
    const { data: request, isLoading } = useRequestByNumber(requestNumber, requestScope)
    const assignedToAvatar = request?.assignedTo?.name
        ? generateAvatarUrl(request.assignedTo.name)
        : undefined

    return (
        <div className="w-full" data-message-id={id}>
            <p className="mb-1.5 flex items-center gap-1 text-ds-fg-subtle text-xs">
                <CornerDownRight className="size-3" />
                <span>{content}</span>
            </p>
            <button
                type="button"
                onClick={onViewRequest}
                disabled={isViewingRequest}
                className="group block w-full text-left"
            >
                <div className="overflow-hidden rounded-sm border border-ds-surface-border bg-ds-surface transition-colors hover:border-ds-surface-border">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-3">
                            <Spinner />
                        </div>
                    ) : request ? (
                        <div className="flex items-center gap-3 px-3 py-2.5">
                            <PriorityBars priority={request.priority} />
                            <span className="font-medium text-ds-fg text-sm">
                                {request.reqNumber}
                            </span>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="rounded-full border border-ds-surface-border font-normal">
                                    <RequestStatusDisplay
                                        status={request.lifecycleStatus}
                                        className="px-2 py-0.5 text-xs"
                                    />
                                </span>
                                <span className="flex items-center gap-1.5 rounded-full border border-ds-surface-border px-2 py-0.5 font-normal text-ds-fg-muted text-sm">
                                    <Calendar className="size-3.5" />
                                    {t("sharedRequest.dateRange", {
                                        from: formatDateShort(request.fromDate, i18n.language),
                                        to: formatDateShort(request.toDate, i18n.language),
                                    })}
                                </span>
                                <div>
                                    {request.assignedTo ? (
                                        <div className="relative">
                                            <Avatar className="size-5.5">
                                                <AvatarImage
                                                    src={
                                                        request.assignedTo.image || assignedToAvatar
                                                    }
                                                    alt={request.assignedTo.name}
                                                />
                                            </Avatar>
                                            <PresenceIndicator
                                                userId={request.assignedTo.id}
                                                size="sm"
                                                className="absolute -right-0.5 -bottom-0.5"
                                                showOffline
                                            />
                                        </div>
                                    ) : (
                                        <CircleDashed className="size-5.5 stroke-[1.5px]" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 text-center text-ds-fg-subtle">
                            <p className="text-sm">{t("sharedRequest.notFound")}</p>
                        </div>
                    )}
                </div>
            </button>
        </div>
    )
}
