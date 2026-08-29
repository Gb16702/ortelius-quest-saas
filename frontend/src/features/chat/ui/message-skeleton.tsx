import { Skeleton } from "@/shared/ui/skeleton"

function DateSeparatorSkeleton() {
    return (
        <div className="relative my-12 flex w-full items-center justify-center">
            <div className="absolute top-1/2 right-0 left-0 -translate-y-1/2 border-ds-surface-border border-b border-dashed" />
            <Skeleton className="relative z-10 h-8 w-24 rounded-full" />
        </div>
    )
}

function SystemMessageSkeleton({ opacity = 1 }: { opacity?: number }) {
    return (
        <div
            className="relative mx-auto flex w-full items-start px-4 sm:px-6 lg:px-10"
            style={{ opacity }}
        >
            <div className="w-full px-14">
                <div className="flex gap-3 rounded-sm border border-ds-surface-border bg-ds-surface p-4">
                    <Skeleton className="size-4 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-12" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function MessageGroupSkeleton({
    messageCount = 2,
    baseOpacity = 1,
}: {
    messageCount?: number
    baseOpacity?: number
}) {
    return (
        <div className="relative mx-auto flex w-full items-start px-4 sm:px-6 lg:px-10">
            <div className="flex w-full items-start px-14">
                <div className="sticky top-6 -ml-14 flex-shrink-0 self-start">
                    <Skeleton className="size-10 rounded-full" style={{ opacity: baseOpacity }} />
                </div>
                <div className="ml-5 flex flex-1 flex-col space-y-4">
                    {Array.from({ length: messageCount }).map((_, idx) => {
                        const messageOpacity = baseOpacity - idx * 0.15
                        return (
                            <div
                                key={`skeleton-msg-${idx}-${messageCount}`}
                                className="space-y-2"
                                style={{ opacity: Math.max(messageOpacity, 0.3) }}
                            >
                                {idx === 0 && (
                                    <div className="flex items-baseline gap-3">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-3 w-10" />
                                    </div>
                                )}
                                <Skeleton
                                    className="h-4 rounded-sm"
                                    style={{
                                        width: `${Math.max(30, 70 - idx * 15)}%`,
                                    }}
                                />
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export function MessagesLoadingSkeleton() {
    return (
        <div className="mx-auto w-full space-y-6 overflow-hidden py-4">
            <DateSeparatorSkeleton />
            <SystemMessageSkeleton opacity={0.95} />
            <MessageGroupSkeleton messageCount={2} baseOpacity={0.9} />
            <SystemMessageSkeleton opacity={0.75} />
            <MessageGroupSkeleton messageCount={3} baseOpacity={0.65} />
            <SystemMessageSkeleton opacity={0.5} />
        </div>
    )
}
