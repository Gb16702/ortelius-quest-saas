import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                "scrollbar-hide flex w-full rounded-sm border border-ds-control-border bg-ds-surface p-3 text-base outline-none transition-[color,border-color,background-color] placeholder:text-ds-fg-muted hover:border-ds-control-border-hover focus-visible:border-ds-control-border-focus focus-visible:ring-[3px] focus-visible:ring-ds-gray-600/40 disabled:cursor-not-allowed disabled:border-ds-control-border-disabled disabled:opacity-50 aria-invalid:border-ds-control-border-invalid aria-invalid:ring-ds-control-ring-invalid aria-invalid:focus-visible:border-ds-control-border-invalid-focus md:text-sm",
                className
            )}
            {...props}
        />
    )
}

export { Textarea }
