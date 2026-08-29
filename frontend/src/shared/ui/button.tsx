import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"
import {
    controlIconClassName,
    controlRadiusVariants,
    controlSizeVariants,
} from "@/shared/ui/control-shape"

const buttonVariants = cva(
    cn(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-none transition-colors duration-150 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-ds-control-border-disabled disabled:bg-ds-control-bg-disabled disabled:text-ds-control-fg-disabled has-[>svg]:min-w-0 aria-invalid:border-ds-control-border-invalid aria-invalid:ring-ds-control-ring-invalid",
        controlIconClassName
    ),
    {
        variants: {
            variant: {
                brand: "border border-transparent bg-ds-accent text-ds-on-accent hover:bg-ds-accent-hover focus-visible:ring-ds-accent-ring/50 active:bg-ds-accent-active",
                solid: "border border-transparent bg-ds-accent text-ds-on-accent hover:bg-ds-accent-hover focus-visible:ring-ds-accent-ring/50 active:bg-ds-accent-active",
                soft: "border border-transparent bg-ds-accent-100 text-ds-accent-800 hover:bg-ds-accent-200 focus-visible:ring-ds-accent-700/35",
                outline:
                    "border border-ds-control-border bg-ds-surface text-ds-fg hover:border-ds-control-border-hover hover:bg-ds-surface-interactive focus-visible:border-ds-control-border-focus focus-visible:ring-ds-ring/40 active:border-ds-control-border-hover",
                danger: "border border-transparent bg-ds-danger-solid text-ds-on-danger hover:bg-ds-danger-solid-hover focus-visible:ring-ds-danger-ring active:bg-ds-danger-solid-active",
                ghost: "border border-transparent text-ds-fg hover:bg-ds-component-bg-hover focus-visible:border-ds-control-border-focus focus-visible:ring-ds-ring/40",
                link: "border border-transparent text-ds-link hover:text-ds-link-hover hover:underline",
                text: "border border-transparent text-ds-fg focus-visible:border-ds-control-border-focus focus-visible:ring-ds-ring/40",
                "text-accent":
                    "border border-transparent text-ds-accent-700 hover:text-ds-accent-750 focus-visible:border-ds-control-border-focus focus-visible:ring-ds-accent-700/40 disabled:border-none disabled:bg-transparent",
            },
            size: controlSizeVariants,
            radius: controlRadiusVariants,
        },
        compoundVariants: [
            {
                variant: "link",
                className: "h-auto min-w-0 p-0 md:p-0",
            },
        ],
        defaultVariants: {
            variant: "solid",
            size: "default",
            radius: "default",
        },
    }
)

function Button({
    className,
    variant,
    size,
    radius,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
    }) {
    const Comp = asChild ? Slot : "button"

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, radius, className }))}
            {...props}
        />
    )
}

export { Button, buttonVariants }
