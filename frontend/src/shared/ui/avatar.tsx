import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { Camera } from "lucide-react"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
    return (
        <AvatarPrimitive.Root
            data-slot="avatar"
            className={cn(
                "relative flex size-7 shrink-0 overflow-hidden rounded-full bg-ds-surface",
                className
            )}
            {...props}
        />
    )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
    return (
        <AvatarPrimitive.Image
            data-slot="avatar-image"
            className={cn("aspect-square size-full", className)}
            {...props}
        />
    )
}

function AvatarFallback({
    className,
    ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
    return (
        <AvatarPrimitive.Fallback
            data-slot="avatar-fallback"
            className={cn(
                "flex size-full items-center justify-center rounded-full bg-muted",
                className
            )}
            {...props}
        />
    )
}

interface AvatarWithIconProps extends React.ComponentProps<"div"> {
    src?: string | null
    alt: string
    icon: React.ReactNode
}

function AvatarWithIcon({ src, alt, icon, className, ...props }: AvatarWithIconProps) {
    if (!src) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center rounded-full border border-ds-surface-border bg-ds-canvas transition-all duration-200 group-hover:border-ds-surface-border",
                    className
                )}
                {...props}
            >
                <Camera className="size-5.5 text-ds-fg" />
            </div>
        )
    }

    return (
        <div className="relative inline-block" {...props}>
            <Avatar className={className}>
                <AvatarImage src={src} alt={alt} />
            </Avatar>
        </div>
    )
}

export { Avatar, AvatarFallback, AvatarImage, AvatarWithIcon }
