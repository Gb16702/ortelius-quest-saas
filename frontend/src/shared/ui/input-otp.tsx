import { OTPInput, OTPInputContext } from "input-otp"
import { MinusIcon } from "lucide-react"
import type * as React from "react"
import { use } from "react"

import { cn } from "@/shared/lib/class-names"

function InputOTP({
    className,
    containerClassName,
    ref,
    ...props
}: React.ComponentProps<typeof OTPInput> & {
    containerClassName?: string
    ref?: React.Ref<HTMLInputElement>
}) {
    return (
        <OTPInput
            ref={ref}
            data-slot="input-otp"
            containerClassName={cn(
                "flex items-center gap-2 has-disabled:opacity-50",
                containerClassName
            )}
            className={cn("disabled:cursor-not-allowed", className)}
            {...props}
        />
    )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="input-otp-group"
            className={cn("flex items-center", className)}
            {...props}
        />
    )
}

function InputOTPSlot({
    index,
    className,
    hasError,
    ...props
}: React.ComponentProps<"div"> & {
    index: number
    hasError?: boolean
}) {
    const inputOTPContext = use(OTPInputContext)
    const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

    return (
        <div
            data-slot="input-otp-slot"
            data-active={isActive}
            aria-invalid={hasError}
            className={cn(
                "relative flex h-12 w-12 items-center justify-center border-ds-control-border border-y border-r bg-ds-surface text-sm outline-none transition-all first:rounded-l-sm first:border-l last:rounded-r-sm data-[active=true]:z-10 data-[active=true]:border-ds-control-border-focus data-[active=true]:ring-[3px] data-[active=true]:ring-ds-gray-600/40",
                "aria-invalid:border-ds-control-border-invalid aria-invalid:bg-ds-danger-soft aria-invalid:ring-ds-control-ring-invalid data-[active=true]:aria-invalid:border-ds-control-border-invalid-focus data-[active=true]:aria-invalid:ring-ds-control-ring-invalid",
                className
            )}
            {...props}
        >
            {char}
            {hasFakeCaret && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
                </div>
            )}
        </div>
    )
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot="input-otp-separator" {...props}>
            <MinusIcon />
        </div>
    )
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
