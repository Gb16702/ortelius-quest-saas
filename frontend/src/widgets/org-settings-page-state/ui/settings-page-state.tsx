import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Button } from "@/shared/ui/button"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"
import { Skeleton } from "@/shared/ui/skeleton"
import { Stack, StackActionButton, StackItem } from "@/shared/ui/stack"

type SettingsPageSkeletonMaxWidth = "3xl" | "4xl" | "5xl" | "7xl"

interface SettingsPageSkeletonProps {
    title: string
    subtitle?: string
    maxWidth?: SettingsPageSkeletonMaxWidth
    rowCount?: number
}

interface SettingsPageLoadErrorProps {
    title: string
    subtitle?: string
    maxWidth?: SettingsPageSkeletonMaxWidth
    message: string
    onRetry: () => void
}

const maxWidthClasses: Record<SettingsPageSkeletonMaxWidth, string> = {
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "7xl": "max-w-[theme(width.7xl)]",
}

export function SettingsPageSkeleton({
    title,
    subtitle,
    maxWidth = "4xl",
    rowCount = 4,
}: SettingsPageSkeletonProps) {
    const { state, meta } = useOrg()
    const rows = Array.from({ length: rowCount }, (_, index) => `settings-skeleton-row-${index}`)

    return (
        <div className="flex w-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(state.org, [
                    { label: "Settings", href: `/org/${meta.slug}/settings` },
                    { label: title },
                ])}
            />
            <ProfilePageHead title={title} subtitle={subtitle} maxWidth={maxWidth} />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className={`flex w-full ${maxWidthClasses[maxWidth]} flex-col py-6`}>
                    <Stack>
                        {rows.map((rowKey, index) => (
                            <StackItem
                                key={rowKey}
                                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton
                                        className={index % 2 === 0 ? "h-4 w-44" : "h-4 w-36"}
                                    />
                                    <Skeleton className="h-3 w-full max-w-lg" />
                                </div>
                                <StackActionButton className="shrink-0">
                                    <Skeleton className="h-9 w-28 rounded-full" />
                                </StackActionButton>
                            </StackItem>
                        ))}
                    </Stack>
                </div>
            </div>
        </div>
    )
}

export function SettingsPageLoadError({
    title,
    subtitle,
    maxWidth = "4xl",
    message,
    onRetry,
}: SettingsPageLoadErrorProps) {
    const { state, meta } = useOrg()

    return (
        <div className="flex w-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(state.org, [
                    { label: "Settings", href: `/org/${meta.slug}/settings` },
                    { label: title },
                ])}
            />
            <ProfilePageHead title={title} subtitle={subtitle} maxWidth={maxWidth} />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className={`flex w-full ${maxWidthClasses[maxWidth]} flex-col py-6`}>
                    <div className="rounded-md border border-ds-surface-border bg-ds-surface p-5">
                        <p className="font-medium text-ds-fg text-sm">{message}</p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            radius="full"
                            className="mt-4"
                            onClick={onRetry}
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
