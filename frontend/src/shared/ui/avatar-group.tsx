import { generateAvatarUrl } from "@/shared/lib/avatar"
import { cn } from "@/shared/lib/class-names"
import { Avatar, AvatarImage } from "@/shared/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

export interface AvatarGroupMember {
    id: string
    name: string
    image?: string | null
    tooltip?: string
}

type AvatarSize = "sm" | "md" | "lg"

interface AvatarGroupProps {
    members: AvatarGroupMember[]
    size?: AvatarSize
    limit?: number
    overlap?: boolean
    className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
    sm: "size-5.5",
    md: "size-8",
    lg: "size-10",
}

export function AvatarGroup({
    members,
    size = "md",
    limit = 3,
    overlap = true,
    className,
}: AvatarGroupProps) {
    if (members.length === 0) return null

    const visibleMembers = members.slice(0, limit)
    const remainingCount = Math.max(0, members.length - limit)

    const sizeClass = sizeClasses[size]
    const overlapClass = overlap ? "-space-x-2" : "space-x-2"

    return (
        <div className={cn("flex w-fit items-center rounded-full border p-0.5", className)}>
            <div className={cn("flex", overlapClass)}>
                {visibleMembers.map((member, index) => {
                    const avatarUrl = member.image || generateAvatarUrl(member.name)
                    const avatarElement = (
                        <Avatar
                            key={member.id}
                            className={cn(
                                sizeClass,
                                "cursor-pointer border border-ds-surface bg-ds-canvas ring-0"
                            )}
                            style={{
                                zIndex: overlap ? index + 1 : undefined,
                            }}
                        >
                            <AvatarImage src={avatarUrl} alt={member.name} />
                        </Avatar>
                    )

                    if (member.tooltip) {
                        return (
                            <Tooltip key={member.id}>
                                <TooltipTrigger asChild>{avatarElement}</TooltipTrigger>
                                <TooltipContent>
                                    <p>{member.tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    }

                    return avatarElement
                })}
            </div>
            {remainingCount > 0 && (
                <span
                    className="flex size-5.5 cursor-pointer items-center justify-center rounded-full border border-ds-surface bg-ds-inverse-surface font-medium text-[10px] text-ds-surface tracking-tight"
                    style={{
                        marginLeft: overlap ? "-0.5rem" : "0.5rem",
                        zIndex: overlap ? visibleMembers.length + 1 : undefined,
                    }}
                >
                    +{remainingCount}
                </span>
            )}
        </div>
    )
}
