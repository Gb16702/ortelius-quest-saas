import { cn } from "@/shared/lib/class-names"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="skeleton"
            className={cn(
                "animate-shimmer rounded-xs bg-[length:200%_100%] bg-gradient-to-r from-ds-gray-300 via-ds-surface to-ds-gray-300",
                className
            )}
            {...props}
        />
    )
}

export { Skeleton }
