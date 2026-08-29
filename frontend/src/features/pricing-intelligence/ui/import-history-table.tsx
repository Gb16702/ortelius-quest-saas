import { Button } from "@/shared/ui/button"
import { Skeleton } from "@/shared/ui/skeleton"

import { usePricingIntelligence } from "../model/pricing-intelligence.provider"

function ImportHistoryTableSkeleton() {
    return (
        <div className="divide-y divide-ds-surface-border">
            {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
                <div key={i} className="flex items-center justify-between px-1 py-3">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-40 rounded-sm" />
                        <Skeleton className="h-4 w-52 rounded-sm" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded-sm" />
                </div>
            ))}
        </div>
    )
}

export function ImportHistoryTable() {
    const { state, actions } = usePricingIntelligence()

    if (state.isLoadingBatches) {
        return <ImportHistoryTableSkeleton />
    }

    if (state.batches.length === 0) {
        return (
            <p className="py-4 text-center text-ds-fg-muted text-sm">
                No imports yet. Upload a CSV to get started.
            </p>
        )
    }

    return (
        <div className="divide-y divide-ds-surface-border">
            {state.batches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between px-1 py-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-ds-fg text-sm">{batch.fileName}</span>
                        <span className="text-ds-fg-muted text-xs">
                            {batch.rowCount} transactions
                            {batch.errorCount > 0 && (
                                <span className="text-ds-danger-text">
                                    {" "}
                                    · {batch.errorCount} errors
                                </span>
                            )}
                            {" · "}
                            {new Date(batch.createdAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                            })}
                        </span>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => actions.deleteBatch(batch.id)}
                        disabled={state.isDeleting}
                    >
                        Delete
                    </Button>
                </div>
            ))}
        </div>
    )
}
