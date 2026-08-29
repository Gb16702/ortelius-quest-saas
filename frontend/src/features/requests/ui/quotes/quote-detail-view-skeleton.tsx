import { Skeleton } from "@/shared/ui/skeleton"

export function QuoteDetailViewSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full max-w-md" />
            </div>

            <div className="space-y-6 rounded-lg border border-ds-surface-border bg-ds-surface p-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                </div>

                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                </div>

                <div className="h-px bg-ds-surface-border" />

                <div className="space-y-4">
                    <Skeleton className="h-5 w-36" />
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-ds-surface-border" />

                <div className="space-y-3">
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                    </div>

                    <div className="h-px bg-ds-surface-border" />

                    <div className="flex justify-between">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-6 w-28" />
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <Skeleton className="h-11 flex-1 rounded-full" />
                <Skeleton className="h-11 flex-1 rounded-full" />
            </div>
        </div>
    )
}
