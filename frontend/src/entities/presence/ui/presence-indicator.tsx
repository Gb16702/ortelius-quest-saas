import { cn } from "@/shared/lib/class-names"
import { useUserPresence } from "../model/use-user-presence"

interface PresenceIndicatorProps {
    userId: string | undefined
    size?: "sm" | "md" | "lg" | "xl"
    className?: string
    showOffline?: boolean
}

const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
    xl: "h-4 w-4",
}

export function PresenceIndicator({
    userId,
    size = "sm",
    className,
    showOffline = false,
}: PresenceIndicatorProps) {
    const presence = useUserPresence(userId)
    const isOnline = presence?.status === "online"

    if (!isOnline && !showOffline) {
        return null
    }

    return (
        // biome-ignore lint/a11y/useSemanticElements: role chosen intentionally; semantic-element refactor pending
        <span
            role="status"
            className={cn(
                "flex-shrink-0 rounded-full border-[1.5px] border-ds-surface",
                sizeClasses[size],
                isOnline ? "bg-ds-green-700" : "bg-ds-gray-400",
                className
            )}
            aria-label={isOnline ? "Online" : "Offline"}
        />
    )
}
