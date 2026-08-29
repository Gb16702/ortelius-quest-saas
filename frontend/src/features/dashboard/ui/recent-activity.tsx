import { useTranslation } from "react-i18next"
import { ActivityDescription, formatRelativeDate } from "@/entities/activity"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { useRecentActivity } from "../model/hooks/use-recent-activity"
import { DataSection, DataSectionItem } from "./data-section"
import { DataSectionSkeleton } from "./data-section-skeleton"

interface RecentActivityProps {
    organizationSlug: string
    organizationId: string | null
    onViewAll?: () => void
    onOpenMemberProfile?: (userId: string) => void
    onOpenRequest?: (requestNumber: string) => void
    className?: string
}

export function RecentActivity({
    organizationSlug,
    organizationId,
    onViewAll,
    onOpenMemberProfile,
    onOpenRequest,
    className,
}: RecentActivityProps) {
    const { t } = useTranslation("dashboard")
    const { data: events = [], isLoading } = useRecentActivity(organizationSlug, organizationId, 5)
    const systemActor = t("recentActivity.systemActor")

    if (isLoading) {
        return (
            <DataSectionSkeleton
                rows={5}
                title={t("recentActivity.title")}
                rightLabel={t("recentActivity.rightLabel")}
                className={className}
            />
        )
    }

    return (
        <DataSection
            title={t("recentActivity.title")}
            rightLabel={t("recentActivity.rightLabel")}
            onViewAll={onViewAll}
            className={className}
        >
            {events.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-ds-fg-muted text-sm">
                    {t("recentActivity.empty")}
                </div>
            ) : (
                events.map((event) => (
                    <DataSectionItem
                        key={event.id}
                        icon={
                            <GeneratedAvatar
                                src={event.actor?.image ?? undefined}
                                fallbackText={event.actor?.name ?? systemActor}
                                alt={event.actor?.name ?? systemActor}
                                size="sm"
                            />
                        }
                        label={
                            <div>
                                <div className="font-medium">
                                    {event.actor?.name ?? systemActor}
                                </div>
                                <ActivityDescription
                                    event={event}
                                    className="block text-ds-fg-muted text-xs first-letter:capitalize"
                                    onOpenMemberProfile={onOpenMemberProfile}
                                    onOpenRequest={onOpenRequest}
                                />
                            </div>
                        }
                        value={formatRelativeDate(event.createdAt)}
                    />
                ))
            )}
        </DataSection>
    )
}
