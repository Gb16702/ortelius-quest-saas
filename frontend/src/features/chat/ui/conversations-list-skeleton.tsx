import { Skeleton } from "@/shared/ui/skeleton"

export function ConversationsListSkeleton() {
    return (
        <div className="space-y-12">
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
                <div className="relative min-w-0 flex-1">
                    <Skeleton className="h-8 w-full rounded-md shadow-control" />
                    <Skeleton className="absolute top-1/2 left-3 size-4 -translate-y-1/2 rounded-full" />
                    <Skeleton className="absolute top-1/2 right-3 h-5 w-12 -translate-y-1/2 rounded-sm" />
                </div>

                <div className="grid grid-cols-3 gap-3 md:flex md:shrink-0 md:items-center">
                    <Skeleton className="h-7 rounded-md shadow-control md:h-8 md:w-24" />
                    <Skeleton className="h-7 rounded-md shadow-control md:h-8 md:w-24" />
                    <Skeleton className="h-7 rounded-md shadow-control md:h-8 md:w-24" />
                </div>
            </div>

            <section className="space-y-4">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="rounded-lg bg-ds-surface p-4 shadow-control"
                        style={{ opacity: 1 - i * 0.15 }}
                    >
                        <div className="flex items-center gap-3">
                            <Skeleton className="size-9 flex-shrink-0 rounded-full" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                                        <Skeleton className="h-4 w-36 max-w-full" />
                                        <div className="flex min-w-0 items-center gap-2">
                                            {i === 0 && (
                                                <Skeleton className="size-2 flex-shrink-0 rounded-full" />
                                            )}
                                            <Skeleton className="h-4 w-full max-w-96" />
                                        </div>
                                    </div>

                                    <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                                        <Skeleton className="h-3 w-20" />
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="size-6 rounded-full" />
                                            <Skeleton className="h-4 w-8" />
                                            <div className="flex -space-x-1">
                                                <Skeleton className="size-5 rounded-full ring-2 ring-ds-surface" />
                                                <Skeleton className="size-5 rounded-full ring-2 ring-ds-surface" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    )
}
