import { cva, type VariantProps } from "class-variance-authority"
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    HelpCircle,
    Info,
    Lightbulb,
    Palette,
    XCircle,
} from "lucide-react"
import * as React from "react"
import { cn } from "@/shared/lib/class-names"

const noteVariants = cva("flex w-full items-start gap-2.5 rounded-sm p-3 text-sm", {
    variants: {
        type: {
            secondary: ["bg-ds-surface-interactive", "text-ds-fg-muted"],
            tertiary: ["bg-ds-gray-50", "text-ds-gray-800"],
            warning: ["bg-ds-amber-100", "text-ds-amber-900"],
            success: ["bg-ds-green-100", "text-ds-green-900"],
            error: ["bg-ds-danger-soft", "text-ds-danger-text"],
            alert: ["bg-ds-danger-soft", "text-ds-danger-text"],
            default: ["bg-ds-surface", "text-ds-fg"],
            info: ["bg-ds-accent-100", "text-ds-accent-900"],
            lite: ["bg-ds-surface", "text-ds-gray-700"],
            ghost: ["bg-transparent", "text-ds-gray-700"],
            violet: ["bg-ds-purple-100", "text-ds-purple-900"],
            cyan: ["bg-ds-teal-100", "text-ds-teal-900"],
        },
        fill: {
            true: "",
            false: "",
        },
        disabled: {
            true: "cursor-not-allowed opacity-60",
            false: "",
        },
    },
    compoundVariants: [
        {
            type: "secondary",
            fill: true,
            class: "bg-ds-surface-interactive",
        },
        {
            type: "tertiary",
            fill: true,
            class: "bg-ds-surface-interactive",
        },
        {
            type: "warning",
            fill: true,
            class: "bg-ds-amber-200",
        },
        {
            type: "success",
            fill: true,
            class: "bg-ds-green-200",
        },
        {
            type: "error",
            fill: true,
            class: "bg-ds-danger-soft-hover",
        },
        {
            type: "alert",
            fill: true,
            class: "bg-ds-danger-soft-hover",
        },
        {
            type: "default",
            fill: true,
            class: "bg-ds-surface-interactive",
        },
        {
            type: "info",
            fill: true,
            class: "bg-ds-accent-300",
        },
        {
            type: "lite",
            fill: true,
            class: "bg-ds-gray-50",
        },
        {
            type: "ghost",
            fill: true,
            class: "bg-ds-gray-50",
        },
        {
            type: "violet",
            fill: true,
            class: "bg-ds-purple-200",
        },
        {
            type: "cyan",
            fill: true,
            class: "bg-ds-teal-200",
        },
    ],
    defaultVariants: {
        type: "default",
        fill: false,
        disabled: false,
    },
})

const resolveIconForType = (type: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
        secondary: Info,
        tertiary: Info,
        warning: AlertTriangle,
        success: CheckCircle,
        error: XCircle,
        alert: AlertCircle,
        default: Info,
        info: Info,
        lite: HelpCircle,
        ghost: Info,
        violet: Palette,
        cyan: Lightbulb,
    }

    return iconMap[type] || Info
}

const resolveIconColor = (type: string) => {
    const colorMap: Record<string, string> = {
        secondary: "text-ds-fg-muted",
        tertiary: "text-ds-gray-500",
        warning: "text-ds-amber-900",
        success: "text-ds-green-600",
        error: "text-ds-danger-text",
        alert: "text-ds-danger-text",
        default: "text-ds-fg-muted",
        info: "text-ds-accent-700",
        lite: "text-ds-gray-500",
        ghost: "text-ds-gray-500",
        violet: "text-ds-purple-600",
        cyan: "text-ds-teal-600",
    }

    return colorMap[type] || "text-ds-fg-muted"
}

interface NoteProps
    extends Omit<React.ComponentPropsWithoutRef<"div">, "type">,
        VariantProps<typeof noteVariants> {
    type?:
        | "secondary"
        | "tertiary"
        | "warning"
        | "success"
        | "error"
        | "alert"
        | "default"
        | "info"
        | "lite"
        | "ghost"
        | "violet"
        | "cyan"
    fill?: boolean
    disabled?: boolean
    label?: string | React.ReactNode | false
    action?: React.ReactNode
    children?: React.ReactNode
    hasIcon?: boolean
    customIcon?: React.ReactNode
}

const Note = React.forwardRef<HTMLDivElement, NoteProps>(
    (
        {
            className,
            type = "default",
            fill = false,
            disabled = false,
            label,
            action,
            children,
            hasIcon = true,
            customIcon,
            ...props
        },
        ref
        // FIXME: refactor pending
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cognitive complexity refactor pending
    ) => {
        const IconComponent = resolveIconForType(type)
        const iconColor = resolveIconColor(type)

        const shouldShowLabel = label !== false
        const displayLabel =
            typeof label === "string" || React.isValidElement(label)
                ? label
                : shouldShowLabel
                  ? "Note"
                  : null

        return (
            <div
                ref={ref}
                className={cn(noteVariants({ type, fill, disabled }), className)}
                {...props}
            >
                {hasIcon && (
                    <div className="mt-px shrink-0">
                        {customIcon ?? <IconComponent className={cn("size-4", iconColor)} />}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div
                        className={cn(
                            "space-y-1",
                            !children && !displayLabel && "flex min-h-[20px] items-center"
                        )}
                    >
                        {displayLabel && (
                            <p
                                className={cn(
                                    "font-normal text-[13px] leading-[1.5]",
                                    type === "secondary" && "text-ds-fg-muted",
                                    type === "tertiary" && "text-ds-gray-600",
                                    type === "warning" && "text-ds-amber-900",
                                    type === "success" && "text-ds-green-700",
                                    type === "error" && "text-ds-danger-text",
                                    type === "alert" && "text-ds-danger-text",
                                    type === "default" && "text-ds-fg-muted",
                                    type === "info" && "text-ds-accent-700",
                                    type === "lite" && "text-ds-gray-600",
                                    type === "ghost" && "text-ds-gray-600",
                                    type === "violet" && "text-ds-purple-700",
                                    type === "cyan" && "text-ds-teal-700"
                                )}
                            >
                                {displayLabel}
                            </p>
                        )}

                        {children && (
                            <p
                                className={cn(
                                    "text-[13px] leading-relaxed",
                                    type === "secondary" && "text-ds-fg-muted",
                                    type === "tertiary" && "text-ds-gray-700",
                                    type === "warning" && "text-ds-amber-900",
                                    type === "success" && "text-ds-green-800",
                                    type === "error" && "text-ds-danger-text",
                                    type === "alert" && "text-ds-danger-text",
                                    type === "default" && "text-ds-fg",
                                    type === "info" && "text-ds-accent-700",
                                    type === "lite" && "text-ds-gray-700",
                                    type === "ghost" && "text-ds-gray-700",
                                    type === "violet" && "text-ds-purple-800",
                                    type === "cyan" && "text-ds-teal-800"
                                )}
                            >
                                {children}
                            </p>
                        )}
                    </div>
                </div>

                {action && <div className="ml-2 shrink-0">{action}</div>}
            </div>
        )
    }
)

Note.displayName = "Note"

export type { NoteProps }
export { Note, noteVariants }
