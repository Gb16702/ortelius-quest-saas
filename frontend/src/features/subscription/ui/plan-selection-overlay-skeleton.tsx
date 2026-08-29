import { Skeleton } from "@/shared/ui/skeleton"

export function PlanSelectionOverlaySkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <PlanSelectionCardSkeleton />
            <PlanSelectionCardSkeleton />
            <PlanSelectionCardSkeleton />
        </div>
    )
}

function PlanSelectionCardSkeleton() {
    return (
        <div className="flex h-full min-h-[460px] flex-col rounded-lg border border-ds-surface-border bg-ds-surface p-6">
            <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-10 w-32" />
            <Skeleton className="mt-3 h-4 w-44" />
            <div className="-mx-6 mt-5 flex items-center justify-between border-ds-surface-border border-y px-6 py-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
            </div>
            <div className="mt-6 flex-1 space-y-5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-10/12" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-8/12" />
            </div>
            <Skeleton className="mt-6 h-11 w-full rounded-full" />
        </div>
    )
}
