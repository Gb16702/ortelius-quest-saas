import { cn } from "@/shared/lib/class-names"
import { DialogBody } from "@/shared/ui/dialog"
import { Spinner } from "@/shared/ui/spinner"

interface LazyDialogBodySpinnerProps {
    label?: string
    className?: string
}

export function LazyDialogBodySpinner({
    label = "Loading...",
    className,
}: LazyDialogBodySpinnerProps) {
    return (
        <DialogBody
            aria-busy="true"
            aria-live="polite"
            className={cn("flex min-h-[220px] items-center justify-center", className)}
        >
            <div className="flex items-center gap-2 text-ds-fg-muted text-sm">
                <Spinner className="size-4" />
                <span>{label}</span>
            </div>
        </DialogBody>
    )
}
