import type { ReactNode } from "react"
import { cn } from "@/shared/lib/class-names"

type ProfilePageHeadWidth = "3xl" | "4xl" | "5xl" | "7xl"

const widthClasses: Record<ProfilePageHeadWidth, string> = {
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "7xl": "max-w-[theme(width.7xl)]",
}

interface ProfilePageHeadProps {
    title: string
    subtitle?: ReactNode
    className?: string
    maxWidth?: ProfilePageHeadWidth
}

export function ProfilePageHead({
    title,
    subtitle,
    className,
    maxWidth = "7xl",
}: ProfilePageHeadProps) {
    return (
        <div
            className={cn("flex w-full items-center justify-center px-4 pt-14 md:px-6", className)}
        >
            <div
                className={cn(
                    "flex w-full flex-col items-start justify-between space-y-4 md:flex-row md:items-center",
                    widthClasses[maxWidth]
                )}
            >
                <div className="space-y-1">
                    <h1 className="font-medium text-ds-fg text-xl leading-[1.4]">{title}</h1>
                    {subtitle && <p className="text-base text-ds-fg-muted">{subtitle}</p>}
                </div>
            </div>
        </div>
    )
}
