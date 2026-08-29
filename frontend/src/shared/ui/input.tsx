import type * as React from "react"

import { cn } from "@/shared/lib/class-names"
import { type FieldControlSize, fieldControlSizeVariants } from "@/shared/ui/field-control-shape"

interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
    size?: FieldControlSize
}

function Input({ className, type, size = "default", ...props }: InputProps) {
    return (
        <input
            type={type}
            data-slot="input"
            data-size={size}
            className={cn(
                "flex w-full min-w-0 rounded-md border border-ds-control-border py-1",
                "bg-ds-surface text-ds-fg placeholder:text-ds-fg-subtle",
                "font-normal outline-none",
                "transition-[color,border-color,background-color] duration-150",
                fieldControlSizeVariants[size],
                "hover:enabled:not-focus-visible:border-ds-control-border-hover",
                "focus-visible:border-ds-control-border-focus",
                "focus-visible:ring-[3px] focus-visible:ring-ds-gray-alpha-300",
                "disabled:border-ds-control-border-disabled disabled:bg-ds-control-bg-disabled",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                "aria-invalid:border-ds-control-border-invalid",
                "aria-invalid:hover:border-ds-control-border-invalid-hover",
                "aria-invalid:ring-ds-control-ring-invalid aria-invalid:focus-visible:border-ds-control-border-invalid-focus",
                "file:inline-flex file:h-7 file:border-0 file:bg-transparent",
                "file:font-medium file:text-ds-fg file:text-sm",
                type === "password" && "tracking-widest placeholder:tracking-normal",
                className
            )}
            {...props}
        />
    )
}

export { Input }
