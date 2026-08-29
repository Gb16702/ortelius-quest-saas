import { cn } from "@/shared/lib/class-names"

interface CharacterCounterProps {
    current: number
    max: number
    className?: string
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
    const remaining = max - current
    const isAtLimit = remaining === 0

    return (
        <span
            className={cn(
                "absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums",
                isAtLimit ? "text-ds-danger-text" : "text-ds-fg-muted",
                className
            )}
        >
            {remaining}
        </span>
    )
}
