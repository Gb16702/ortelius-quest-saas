import { cva, type VariantProps } from "class-variance-authority"
import { Toggle as TogglePrimitive } from "radix-ui"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"
import {
    controlIconClassName,
    controlRadiusVariants,
    controlSizeVariants,
} from "@/shared/ui/control-shape"

const toggleVariants = cva(
    cn(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-normal text-sm outline-none transition-colors duration-150 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-ds-control-border-disabled disabled:bg-ds-control-bg-disabled disabled:text-ds-control-fg-disabled",
        controlIconClassName
    ),
    {
        variants: {
            variant: {
                tertiary:
                    "border border-ds-control-border bg-ds-surface text-ds-fg hover:border-ds-control-border-hover hover:bg-ds-surface-interactive focus-visible:border-ds-control-border-focus focus-visible:ring-ds-ring/40 data-[state=on]:border-ds-control-border-hover data-[state=on]:bg-ds-surface-interactive",
                ghost: "border border-transparent text-ds-fg hover:bg-ds-component-bg-hover focus-visible:border-ds-control-border-focus focus-visible:ring-ds-ring/40 data-[state=on]:bg-ds-component-bg-hover",
            },
            size: controlSizeVariants,
            radius: controlRadiusVariants,
        },
        defaultVariants: {
            variant: "tertiary",
            size: "default",
            radius: "default",
        },
    }
)

function Toggle({
    className,
    variant,
    size,
    radius,
    ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
    return (
        <TogglePrimitive.Root
            data-slot="toggle"
            className={cn(toggleVariants({ variant, size, radius, className }))}
            {...props}
        />
    )
}

export { Toggle, toggleVariants }
