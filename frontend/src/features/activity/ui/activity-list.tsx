import { memo, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { ActivityEvent } from "@/entities/activity"
import { ActivityDescription, formatRelativeDate, groupEventsByMonth } from "@/entities/activity"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { ActivityIcon } from "@/shared/ui/sidebar-icons"
import { Skeleton } from "@/shared/ui/skeleton"
import { Spinner } from "@/shared/ui/spinner"

interface ActivityListProps {
    events: ActivityEvent[]
    currentUserId: string
    hasNextPage: boolean
    isFetchingNextPage: boolean
    onLoadMore: () => void
    hasActiveFilters: boolean
    onClearFilters: () => void
    onOpenMemberProfile?: (userId: string) => void
    onOpenRequest?: (requestNumber: string) => void
}

export function ActivityList({
    events,
    currentUserId,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    hasActiveFilters,
    onClearFilters,
    onOpenMemberProfile,
    onOpenRequest,
}: ActivityListProps) {
    const { t } = useTranslation("team")
    const groups = useMemo(() => groupEventsByMonth(events), [events])

    if (events.length === 0) {
        return (
            <div className="px-6">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ActivityIcon />
                        </EmptyMedia>
                        <EmptyTitle>
                            {hasActiveFilters
                                ? t("activity.emptyFilteredTitle")
                                : t("activity.emptyTitle")}
                        </EmptyTitle>
                    </EmptyHeader>
                    {hasActiveFilters && (
                        <EmptyContent>
                            <Button
                                variant="outline"
                                size="sm"
                                radius="full"
                                onClick={onClearFilters}
                            >
                                {t("activity.clearFilters")}
                            </Button>
                        </EmptyContent>
                    )}
                </Empty>
            </div>
        )
    }

    return (
        <div>
            {groups.map((group, index) => (
                <div key={group.label}>
                    <div
                        className={cn(
                            "mt-1 -mb-1.5 px-6 pb-4 font-semibold text-base text-ds-fg",
                            index === 0 ? "pt-0" : "pt-8"
                        )}
                    >
                        {group.label}
                    </div>
                    <div>
                        {group.events.map((event) => (
                            <ActivityRow
                                key={event.id}
                                event={event}
                                currentUserId={currentUserId}
                                onOpenMemberProfile={onOpenMemberProfile}
                                onOpenRequest={onOpenRequest}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {hasNextPage && (
                <div className="px-6 py-4">
                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={onLoadMore}
                        disabled={isFetchingNextPage}
                    >
                        {isFetchingNextPage ? <Spinner /> : t("activity.loadMore")}
                    </Button>
                </div>
            )}
        </div>
    )
}

interface ActivityRowProps {
    event: ActivityEvent
    currentUserId: string
    onOpenMemberProfile?: (userId: string) => void
    onOpenRequest?: (requestNumber: string) => void
}

const ActivityRow = memo(function ActivityRow({
    event,
    currentUserId,
    onOpenMemberProfile,
    onOpenRequest,
}: ActivityRowProps) {
    const { t } = useTranslation("team")
    const isMe = event.actorId === currentUserId
    const actorName = isMe
        ? t("activity.actorYou")
        : (event.actor?.name ?? t("activity.actorSystem"))

    return (
        <div className="flex items-center gap-4 px-6 py-4">
            <GeneratedAvatar
                src={event.actor?.image}
                fallbackText={event.actor?.name ?? "S"}
                size="md"
            />
            <p className="min-w-0 flex-1 truncate text-ds-fg text-sm">
                <span className="font-medium">{actorName}</span>{" "}
                <ActivityDescription
                    event={event}
                    className="text-ds-fg-muted"
                    onOpenMemberProfile={onOpenMemberProfile}
                    onOpenRequest={onOpenRequest}
                />
            </p>
            <time className="shrink-0 text-ds-fg-muted text-sm">
                {formatRelativeDate(event.createdAt)}
            </time>
        </div>
    )
})

export function ActivityListSkeleton() {
    return (
        <div className="h-full overflow-hidden">
            <div className="px-6 pb-4">
                <Skeleton className="h-5 w-32" />
            </div>
            {Array.from({ length: 20 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <Skeleton className="h-4 max-w-md flex-1" />
                    <Skeleton className="ml-auto h-4 w-12 shrink-0" />
                </div>
            ))}
        </div>
    )
}
