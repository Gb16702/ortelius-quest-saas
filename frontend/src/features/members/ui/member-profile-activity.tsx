import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { ActivityDescription, formatRelativeDate } from "@/entities/activity"
import { Button } from "@/shared/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { ActivityIcon } from "@/shared/ui/sidebar-icons"
import { Skeleton } from "@/shared/ui/skeleton"
import { useMemberActivity } from "../model/hooks/use-member-activity"
import { useMemberProfileDialog } from "../model/hooks/use-member-profile-dialog"

interface MemberProfileActivityProps {
    userId: string
    organizationSlug: string | null
    organizationId: string | null
    onOpenRequest?: (requestNumber: string) => void
    onNavigate?: (href: string) => void
}

export function MemberProfileActivity({
    userId,
    organizationSlug,
    organizationId,
    onOpenRequest,
}: MemberProfileActivityProps) {
    const { t } = useTranslation("team")
    const { data: events = [], isLoading } = useMemberActivity(
        userId,
        organizationSlug,
        organizationId
    )
    const { openProfile } = useMemberProfileDialog()

    if (isLoading) {
        return (
            <div>
                <div className="px-8 pt-5 pb-3">
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="flex flex-col gap-y-1 px-8">
                    {Array.from({ length: 3 }, (_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                        <div key={i} className="flex items-center justify-between py-3">
                            <Skeleton className="h-4 w-3/5" />
                            <Skeleton className="h-4 w-10" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div className="px-8 py-4">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ActivityIcon />
                        </EmptyMedia>
                        <EmptyTitle>{t("profile.noRecentActivity")}</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            </div>
        )
    }

    return (
        <div className="pb-6">
            <div className="flex items-center justify-between px-8 pt-5 pb-3">
                <h3 className="font-medium text-ds-fg text-sm">{t("profile.recentActivity")}</h3>
                {organizationSlug && (
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            to="/org/$slug/team/activity"
                            params={{ slug: organizationSlug }}
                            search={{ actorId: userId }}
                        >
                            {t("profile.viewDetails")}
                        </Link>
                    </Button>
                )}
            </div>
            <div className="flex flex-col">
                {events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between px-8 py-2.5">
                        <ActivityDescription
                            event={event}
                            className="text-ds-fg text-sm first-letter:capitalize"
                            onOpenMemberProfile={openProfile}
                            onOpenRequest={onOpenRequest}
                        />
                        <span className="ml-4 shrink-0 text-ds-fg-muted text-xs">
                            {formatRelativeDate(event.createdAt)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
