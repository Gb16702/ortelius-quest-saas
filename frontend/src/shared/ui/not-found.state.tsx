import type { ReactNode } from "react"

import { cn } from "@/shared/lib/class-names"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "./empty"

interface NotFoundStateProps {
    title?: string
    description?: string
    className?: string
    children?: ReactNode
}

function NotFoundState({
    title = "Page not found",
    description = "This page may have moved or no longer exists.",
    className,
    children,
}: NotFoundStateProps) {
    return (
        <Empty className={cn("border-0 bg-transparent py-0", className)}>
            <EmptyHeader className="max-w-md gap-5">
                <NotFoundIllustration />
                <div className="space-y-2">
                    <EmptyTitle className="font-medium text-ds-fg text-sm tracking-normal">
                        {title}
                    </EmptyTitle>
                    <EmptyDescription className="mx-auto max-w-sm text-pretty text-ds-fg-muted text-sm leading-6">
                        {description}
                    </EmptyDescription>
                </div>
            </EmptyHeader>
            {children ? <EmptyContent className="pt-1">{children}</EmptyContent> : null}
        </Empty>
    )
}

function NotFoundIllustration() {
    return (
        <svg
            aria-hidden="true"
            className="h-24 w-44 text-ds-fg-muted drop-shadow-[0_12px_20px_rgb(0_0_0_/_0.035)]"
            fill="none"
            viewBox="0 0 176 112"
        >
            <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path
                    d="M34 78c17-24 36-26 52-10 15 15 31 11 48-14"
                    strokeOpacity="0.1"
                    strokeWidth="10"
                />
                <path
                    d="M34 78c17-24 36-26 52-10 15 15 31 11 48-14"
                    strokeOpacity="0.48"
                    strokeWidth="1.75"
                />
                <path
                    d="M134 54c5-8 10-12 17-14"
                    strokeDasharray="3 6"
                    strokeOpacity="0.34"
                    strokeWidth="1.75"
                />

                <circle
                    className="fill-ds-surface"
                    cx="34"
                    cy="78"
                    r="6"
                    strokeOpacity="0.46"
                    strokeWidth="1.5"
                />
                <circle
                    className="fill-ds-surface"
                    cx="86"
                    cy="68"
                    r="6"
                    strokeOpacity="0.42"
                    strokeWidth="1.5"
                />
                <circle
                    className="fill-ds-surface"
                    cx="134"
                    cy="54"
                    r="6"
                    strokeOpacity="0.52"
                    strokeWidth="1.5"
                />
                <path d="M131 51 137 57M137 51 131 57" strokeOpacity="0.72" strokeWidth="1.5" />
            </g>
        </svg>
    )
}

export { NotFoundState }
