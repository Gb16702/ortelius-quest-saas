import { cn } from "@/shared/lib/class-names"
import type { RequestPriority } from "../model/request"

interface PriorityBarsProps {
    priority: RequestPriority | undefined
    className?: string
}

export function PriorityBars({ priority, className }: PriorityBarsProps) {
    const level = priority === "high" ? 3 : priority === "medium" ? 2 : priority === "low" ? 1 : 0

    return (
        <div className={cn("flex h-4 items-end gap-[2px]", className)}>
            <div
                className={cn(
                    "h-2 w-1 rounded-[1px]",
                    level >= 1 ? "bg-ds-fg-muted" : "bg-ds-gray-500"
                )}
            />
            <div
                className={cn(
                    "h-3 w-1 rounded-[1px]",
                    level >= 2 ? "bg-ds-fg-muted" : "bg-ds-gray-500"
                )}
            />
            <div
                className={cn(
                    "h-4 w-1 rounded-[1px]",
                    level >= 3 ? "bg-ds-fg-muted" : "bg-ds-gray-500"
                )}
            />
        </div>
    )
}
