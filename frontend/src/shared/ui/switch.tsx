import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

const switchVariants = cva(
    "peer inline-flex shrink-0 items-center rounded-full border outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ds-accent-ring/35 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-ds-accent data-[state=unchecked]:border-ds-control-border data-[state=checked]:bg-ds-accent data-[state=unchecked]:bg-ds-surface-interactive data-[state=checked]:focus-visible:border-ds-accent-hover data-[state=unchecked]:focus-visible:border-ds-control-border-focus",
    {
        variants: {
            size: {
                default: "h-[1.15rem] w-8",
                lg: "h-6 w-10",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

const switchThumbVariants = cva(
    "pointer-events-none block rounded-full bg-ds-surface ring-0 transition-transform data-[state=unchecked]:translate-x-0 data-[state=unchecked]:shadow-[0_1px_4px_#00000045]",
    {
        variants: {
            size: {
                default: "size-4 data-[state=checked]:translate-x-[.85rem]",
                lg: "size-5.5 data-[state=checked]:translate-x-[1rem]",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

interface SwitchProps
    extends React.ComponentProps<typeof SwitchPrimitive.Root>,
        VariantProps<typeof switchVariants> {}

function Switch({ className, size, ...props }: SwitchProps) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            className={cn(switchVariants({ size, className }))}
            {...props}
        >
            <SwitchPrimitive.Thumb
                data-slot="switch-thumb"
                className={cn(switchThumbVariants({ size }))}
            />
        </SwitchPrimitive.Root>
    )
}

export { Switch }
