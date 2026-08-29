import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

function Card({
    className,
    withShadow = false,
    ...props
}: React.ComponentProps<"div"> & {
    withShadow?: boolean
}) {
    return (
        <div
            data-slot="card"
            className={cn(
                "flex scroll-mt-14 flex-col gap-6 overflow-hidden rounded-sm bg-ds-surface text-card-foreground",
                withShadow ? "shadow-card" : "border border-ds-surface-border",
                className
            )}
            {...props}
        />
    )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-header"
            className={cn(
                "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 p-6 pb-0 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
                className
            )}
            {...props}
        />
    )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-title"
            className={cn("font-semibold text-xl leading-none", className)}
            {...props}
        />
    )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-description"
            className={cn("text-ds-fg text-sm", className)}
            {...props}
        />
    )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-action"
            className={cn(
                "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
                className
            )}
            {...props}
        />
    )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
    return <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-footer"
            className={cn(
                "flex min-h-[57px] items-center border-ds-surface-border border-t bg-ds-canvas px-6 py-3",
                className
            )}
            {...props}
        />
    )
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
