import { Link } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { useTranslation } from "react-i18next"
import { RequestStatusDisplay } from "@/entities/request"
import { Button } from "@/shared/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { RequestsIcon } from "@/shared/ui/sidebar-icons"

const MAX_VISIBLE_REQUESTS = 4

interface MemberProfileRequestsProps {
    requests: Array<{
        id: string
        requestNumber: string
        lifecycleStatus: string
        closedReason: string | null
        categories: string[]
        services: string[]
        createdAt: string
    }>
    userId: string
    isCurrentUser: boolean
    organizationSlug: string | null
    onOpenRequest?: (requestNumber: string) => void
    onNavigate?: (href: string) => void
}

export function MemberProfileRequests({
    requests,
    userId,
    // biome-ignore lint/correctness/noUnusedFunctionParameters: parameter is part of externally-imposed component/hook props signature
    isCurrentUser,
    organizationSlug,
    onOpenRequest,
}: MemberProfileRequestsProps) {
    const { t } = useTranslation("team")
    const visibleRequests = requests.slice(0, MAX_VISIBLE_REQUESTS)
    const detailsHref = organizationSlug
        ? `/org/${organizationSlug}/requests?assignedTo=${encodeURIComponent(userId)}`
        : null

    if (requests.length === 0) {
        return (
            <div className="px-8 py-4">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <RequestsIcon />
                        </EmptyMedia>
                        <EmptyTitle>{t("profile.noAssignedRequests")}</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between px-8 pt-5 pb-3">
                <h3 className="font-medium text-ds-fg text-sm">{t("profile.assignedRequests")}</h3>
                {detailsHref && (
                    <Button variant="outline" size="sm" className="text-sm" asChild>
                        <Link to={detailsHref}>{t("profile.viewDetails")}</Link>
                    </Button>
                )}
            </div>
            <div className="flex flex-col">
                {visibleRequests.map((request) => (
                    <button
                        type="button"
                        onClick={() => onOpenRequest?.(request.requestNumber)}
                        key={request.id}
                        className="flex w-full cursor-pointer items-center gap-x-3 px-8 py-3 text-left hover:bg-ds-surface-hover"
                    >
                        <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
                            <span className="font-medium text-ds-fg text-sm">
                                {request.requestNumber}
                            </span>
                            <span className="font-normal text-ds-fg-muted text-xs">
                                {t("profile.requestCreated", {
                                    distance: formatDistanceToNow(new Date(request.createdAt), {
                                        addSuffix: true,
                                    }),
                                })}
                            </span>
                        </div>
                        <RequestStatusDisplay
                            status={request.lifecycleStatus}
                            className="shrink-0 font-medium text-sm"
                        />
                    </button>
                ))}
            </div>
        </div>
    )
}
