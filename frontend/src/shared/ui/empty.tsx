import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/class-names"

function Empty({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="empty"
            className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-y-6 text-balance rounded-sm border border-ds-surface-border bg-ds-surface py-12 text-center",
                className
            )}
            {...props}
        />
    )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="empty-header"
            className={cn("flex max-w-sm flex-col items-center gap-3 text-center", className)}
            {...props}
        />
    )
}

const emptyMediaVariants = cva(
    "flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-transparent",
                icon: "size-12 rounded-sm border border-ds-surface-border bg-ds-surface text-ds-fg-muted [&_svg:not([class*='size-'])]:size-6",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function EmptyMedia({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
    return (
        <div
            data-slot="empty-icon"
            data-variant={variant}
            className={cn(emptyMediaVariants({ variant, className }))}
            {...props}
        />
    )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="empty-title"
            className={cn("font-normal text-ds-fg-muted text-sm tracking-tight", className)}
            {...props}
        />
    )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <div
            data-slot="empty-description"
            className={cn(
                "text-ds-fg-muted text-sm [&>a:hover]:text-ds-fg [&>a]:underline [&>a]:underline-offset-4",
                className
            )}
            {...props}
        />
    )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="empty-content"
            className={cn(
                "flex w-full max-w-sm flex-col items-center gap-3 sm:flex-row sm:justify-center",
                className
            )}
            {...props}
        />
    )
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle }
