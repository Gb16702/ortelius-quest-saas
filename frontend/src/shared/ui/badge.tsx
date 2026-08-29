import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

const badgeVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-full border font-medium capitalize transition-colors",
    {
        variants: {
            variant: {
                accent: "border-ds-badge-accent-border bg-ds-badge-accent-bg text-ds-badge-accent-fg",
                neutral:
                    "border-ds-badge-neutral-border bg-ds-badge-neutral-bg text-ds-badge-neutral-fg",
                positive:
                    "border-ds-badge-positive-border bg-ds-badge-positive-bg text-ds-badge-positive-fg",
                attention:
                    "border-ds-badge-attention-border bg-ds-badge-attention-bg text-ds-badge-attention-fg",
                danger: "border-ds-badge-danger-border bg-ds-badge-danger-bg text-ds-badge-danger-fg",
            },
            size: {
                xs: "h-4 gap-0.5 px-1 text-[10px] [&_svg]:h-[10px] [&_svg]:w-[10px]",
                sm: "h-5 gap-0.5 px-2 text-[11px] [&_svg]:h-[11px] [&_svg]:w-[11px]",
                md: "h-6 gap-1 px-2.5 text-xs [&_svg]:h-[14px] [&_svg]:w-[14px]",
                lg: "h-7 gap-1.5 px-2.5 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5",
            },
        },
        defaultVariants: {
            variant: "accent",
            size: "md",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {
    icon?: React.ReactNode
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
            {icon && <span>{icon}</span>}
            {children}
        </span>
    )
}

export { Badge, badgeVariants }
