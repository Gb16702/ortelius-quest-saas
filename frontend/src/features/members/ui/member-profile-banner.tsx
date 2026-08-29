import { formatDistanceToNow } from "date-fns"
import { useTranslation } from "react-i18next"
import { parseRole, type Role } from "@/entities/access"
import { PresenceIndicator } from "@/entities/presence"
import { generateAvatarUrl } from "@/shared/lib/avatar"
import { Avatar, AvatarImage } from "@/shared/ui/avatar"

interface MemberProfileBannerProps {
    user: {
        id: string
        name: string
        email: string
        image: string | null
        dominantColor: string | null
    }
    membership: {
        role: Role
        joinedAt: string
    }
    isCurrentUser: boolean
}

export function MemberProfileBanner({ user, membership }: MemberProfileBannerProps) {
    const { t } = useTranslation("team")
    const { t: tCommon } = useTranslation("common")
    const parsedRole = parseRole(membership.role)
    return (
        <div className="flex w-full flex-col overflow-hidden">
            <div className="relative aspect-[4/1] w-full border-ds-surface-border border-b">
                <div
                    className="h-full w-full bg-ds-surface-interactive"
                    style={user.dominantColor ? { backgroundColor: user.dominantColor } : undefined}
                />

                <div className="absolute bottom-0 left-8 translate-y-1/2">
                    <div className="relative rounded-full bg-ds-surface">
                        <Avatar className="h-20 w-20 border-4 border-ds-surface">
                            <AvatarImage
                                src={user.image || generateAvatarUrl(user.name)}
                                alt={user.name}
                            />
                        </Avatar>
                        <div className="absolute right-0 bottom-0">
                            <PresenceIndicator
                                userId={user.id}
                                size="xl"
                                className="absolute right-1.5 bottom-1.5"
                                showOffline
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-y-1 px-8 pt-12 pb-4">
                <div className="flex items-center gap-x-10">
                    <h2 className="font-semibold text-ds-fg text-lg">{user.name}</h2>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-x-1.5 text-ds-fg-muted text-xs">
                        <p>{user.email}</p>
                    </div>
                    <div className="flex gap-x-4">
                        <div className="flex items-center gap-x-1.5 text-ds-fg-muted text-xs">
                            <p>{parsedRole ? tCommon(`role.${parsedRole}`) : membership.role}</p>
                        </div>
                        <div className="flex items-center gap-x-1.5 text-ds-fg-muted text-xs">
                            <p>
                                {t("profile.joinedAgo", {
                                    duration: formatDistanceToNow(new Date(membership.joinedAt)),
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
