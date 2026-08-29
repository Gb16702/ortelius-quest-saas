import { ChevronDown } from "lucide-react"
import type * as React from "react"
import { cn } from "@/shared/lib/class-names"
import { type FieldControlSize, fieldControlSizeVariants } from "@/shared/ui/field-control-shape"

interface NativeSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
    children: React.ReactNode
    size?: FieldControlSize
}

function NativeSelect({ className, children, size = "default", ...props }: NativeSelectProps) {
    return (
        <div className={cn("relative", className)}>
            <select
                data-size={size}
                className={cn(
                    "flex w-full appearance-none items-center justify-between gap-2 rounded-sm border border-ds-control-border bg-ds-surface py-1 pr-10 font-normal outline-none transition-[color,border-color,background-color] duration-200 hover:border-ds-control-border-hover hover:bg-ds-surface-interactive focus-visible:border-ds-control-border-focus focus-visible:ring-[3px] focus-visible:ring-ds-gray-600/40 active:border-ds-control-border-hover disabled:cursor-not-allowed disabled:border-ds-control-border-disabled disabled:opacity-50 aria-invalid:border-ds-control-border-invalid aria-invalid:ring-ds-control-ring-invalid aria-invalid:focus-visible:border-ds-control-border-invalid-focus",
                    fieldControlSizeVariants[size]
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ds-fg" />
        </div>
    )
}

export { NativeSelect }
