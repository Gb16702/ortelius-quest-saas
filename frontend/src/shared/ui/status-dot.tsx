import type { ReactNode } from "react"

import { cn } from "@/shared/lib/class-names"

interface StatusDotProps {
    colorClassName: string
    label?: ReactNode
    showLabel?: boolean
    className?: string
}

export function StatusDot({ colorClassName, label, showLabel = true, className }: StatusDotProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className={cn("h-2 w-2 flex-shrink-0 rounded-full", colorClassName)} />
            {showLabel && label && <span className="text-ds-fg text-sm capitalize">{label}</span>}
        </div>
    )
}
