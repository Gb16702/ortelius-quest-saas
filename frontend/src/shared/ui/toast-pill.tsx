import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { cn } from "@/shared/lib/class-names"
import { isInternalRouteHref } from "@/shared/lib/navigation/internal-route-href"
import { Button } from "@/shared/ui/button"

export type ToastAction = { label: string; onClick: () => void } | { label: string; href: string }

export type ToastVariant = "success" | "error" | "pending"

interface ToastPillProps {
    variant: ToastVariant
    icon?: ReactNode
    message: string
    action?: ToastAction
    onDismiss: () => void
}

const darkContainer = "bg-ds-inverse-surface text-ds-inverse-fg"
const textAction =
    "h-6 shrink-0 text-ds-inverse-fg hover:!bg-ds-surface/10 hover:text-ds-inverse-fg md:h-6"

const containerByVariant: Record<ToastVariant, string> = {
    success: darkContainer,
    error: "bg-ds-danger-solid text-ds-on-danger",
    pending: darkContainer,
}

const actionByVariant: Record<ToastVariant, string> = {
    success: textAction,
    error: textAction,
    pending: textAction,
}

export const ToastPill = ({ variant, icon, message, action, onDismiss }: ToastPillProps) => {
    return (
        <div
            className={cn(
                "group flex h-10 min-w-[280px] items-center gap-3 rounded-sm px-3 py-2",
                "border border-ds-surface",
                containerByVariant[variant]
            )}
        >
            {icon ? (
                <span aria-hidden="true" className="shrink-0">
                    {icon}
                </span>
            ) : null}
            <span className="min-w-0 flex-1 truncate pr-1 font-medium text-xs">{message}</span>
            {action ? (
                <ToastActionPill
                    action={action}
                    onDismiss={onDismiss}
                    className={actionByVariant[variant]}
                />
            ) : null}
        </div>
    )
}

interface ToastActionPillProps {
    action: ToastAction
    onDismiss: () => void
    className: string
}

const ToastActionPill = ({ action, onDismiss, className }: ToastActionPillProps) => {
    if ("href" in action) {
        if (isInternalRouteHref(action.href)) {
            return (
                <Button asChild variant="ghost" size="xs" radius="full" className={className}>
                    <Link to={action.href} preload={false} onClick={onDismiss}>
                        {action.label}
                    </Link>
                </Button>
            )
        }

        return (
            <Button asChild variant="ghost" size="xs" radius="full" className={className}>
                <a href={action.href} onClick={onDismiss}>
                    {action.label}
                </a>
            </Button>
        )
    }

    return (
        <Button
            variant="ghost"
            size="xs"
            radius="full"
            className={className}
            onClick={() => {
                action.onClick()
                onDismiss()
            }}
        >
            {action.label}
        </Button>
    )
}
