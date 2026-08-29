import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(
                "peer size-4 shrink-0 rounded-[4px] border border-ds-control-border bg-ds-surface outline-none transition-shadow focus-visible:border-ds-control-border-focus focus-visible:ring-[3px] focus-visible:ring-ds-accent-ring/35 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-ds-control-border-invalid aria-invalid:bg-ds-danger-soft aria-invalid:ring-ds-control-ring-invalid data-[state=checked]:border-ds-accent data-[state=checked]:bg-ds-accent data-[state=checked]:text-ds-on-accent data-[state=indeterminate]:text-ds-accent-text",
                className
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className="flex items-center justify-center text-current transition-none"
            >
                <CheckIcon className="!size-3" strokeWidth={2.5} />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    )
}

export { Checkbox }
