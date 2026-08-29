import { generateAvatarUrl } from "@/shared/lib/avatar"
import { cn } from "@/shared/lib/class-names"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"

interface GeneratedAvatarProps {
    src?: string | null
    alt?: string
    fallbackText?: string
    className?: string
    size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
}

const sizeClasses = {
    xxs: "size-4 text-[8px]",
    xs: "size-5 text-[10px]",
    sm: "size-6 text-xs",
    md: "size-7 text-sm",
    lg: "size-9 text-base",
    xl: "size-10 text-lg",
    "2xl": "size-12 text-lg",
    "3xl": "size-16 text-xl",
}

export const GeneratedAvatar = ({
    src,
    alt = "Avatar",
    fallbackText = "",
    className,
    size = "md",
}: GeneratedAvatarProps) => {
    const fallbackSeed = fallbackText.trim()
    const avatarSrc = src || (fallbackSeed ? generateAvatarUrl(fallbackSeed) : undefined)

    return (
        <Avatar className={cn(sizeClasses[size], className)}>
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={alt} /> : null}
            <AvatarFallback />
        </Avatar>
    )
}
