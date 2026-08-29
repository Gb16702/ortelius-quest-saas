import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useOrganizationMembers } from "@/entities/member"
import { PresenceIndicator } from "@/entities/presence"
import { orgSidebarMemberConversationsQueryOptions } from "@/features/chat"
import { cn } from "@/shared/lib/class-names"
import {
    readSidebarSectionPreference,
    writeSidebarSectionPreference,
} from "@/shared/lib/sidebar-section-preference"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/shared/ui/sidebar"
import { selectSidebarMembers } from "../lib/org-sidebar-members"

const membersSectionAnimationCurve = "cubic-bezier(0.2, 0, 0, 1)"

interface OrgSidebarMembersSectionProps {
    organizationId: string
    currentUserId: string
    slug: string
    onOpenProfile: (userId: string) => void
    onOpenProfileIntent?: () => void
    onNavigationIntent: (href: string, intent: "click" | "focus" | "hover", label: string) => void
}

function getOrgMembersSectionPreferenceId(organizationId: string): string {
    return `org:${organizationId}:members`
}

export function OrgSidebarMembersSection({
    organizationId,
    currentUserId,
    slug,
    onOpenProfile,
    onOpenProfileIntent,
    onNavigationIntent,
}: OrgSidebarMembersSectionProps) {
    const { t } = useTranslation("workspace")
    const preferenceId = getOrgMembersSectionPreferenceId(organizationId)
    const [isOpen, setIsOpen] = useState(() => readSidebarSectionPreference(preferenceId))

    const membersQuery = useOrganizationMembers(organizationId, {
        enabled: Boolean(organizationId),
    })
    const conversationsQuery = useQuery({
        ...orgSidebarMemberConversationsQueryOptions({
            userId: currentUserId,
            organizationId,
        }),
        enabled: Boolean(currentUserId && organizationId),
    })

    const members = useMemo(
        () =>
            selectSidebarMembers({
                members: membersQuery.data ?? [],
                conversations: conversationsQuery.data?.conversations ?? [],
                currentUserId,
            }),
        [conversationsQuery.data?.conversations, currentUserId, membersQuery.data]
    )

    const handleOpenChange = useCallback(
        (open: boolean) => {
            setIsOpen(open)
            writeSidebarSectionPreference(preferenceId, open)
        },
        [preferenceId]
    )

    const seeMoreHref = `/org/${slug}/chats?type=member_dm`
    const hasMembersData = membersQuery.data !== undefined
    const hasMembersUnavailable = membersQuery.isError && !hasMembersData
    const totalVisibleMembers =
        membersQuery.data?.filter((member) => member.user.id !== currentUserId).length ?? 0
    const hasMoreMembers = hasMembersData && totalVisibleMembers > members.length
    const membersSectionLabel = t("sidebar.membersSection", { defaultValue: "Team members" })

    return (
        <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
            <SidebarGroup className="px-2">
                <SidebarGroupLabel
                    asChild
                    className="group/nav cursor-pointer transition-colors hover:bg-ds-sidebar-surface-hover hover:text-ds-sidebar-text"
                >
                    <CollapsibleTrigger>
                        <span>{membersSectionLabel}</span>
                        <span className="ml-auto grid size-6 place-content-center rounded-sm text-ds-sidebar-text-muted transition-colors group-hover/nav:bg-ds-sidebar-surface-active group-hover/nav:text-ds-sidebar-text">
                            <ChevronRight
                                className={cn(
                                    "!size-4 transition-transform duration-[140ms]",
                                    isOpen && "rotate-90"
                                )}
                                style={{ transitionTimingFunction: membersSectionAnimationCurve }}
                            />
                        </span>
                    </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent
                    className="data-[state=closed]:[animation-duration:110ms] data-[state=open]:[animation-duration:140ms]"
                    style={{ animationTimingFunction: membersSectionAnimationCurve }}
                >
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {hasMembersUnavailable && (
                                <SidebarMenuItem>
                                    <div className="px-2 py-1 text-ds-sidebar-text-muted text-xs">
                                        {t("sidebar.membersUnavailable", {
                                            defaultValue: "Members unavailable",
                                        })}
                                    </div>
                                </SidebarMenuItem>
                            )}

                            {hasMembersData &&
                                members.map(({ member, conversation }) => {
                                    const label = member.user.name

                                    return (
                                        <SidebarMenuItem key={member.id}>
                                            <SidebarMenuButton
                                                title={label}
                                                onClick={() => onOpenProfile(member.user.id)}
                                                onFocus={onOpenProfileIntent}
                                                onPointerEnter={onOpenProfileIntent}
                                            >
                                                <span className="relative shrink-0">
                                                    <GeneratedAvatar
                                                        src={member.user.image}
                                                        fallbackText={member.user.name}
                                                        alt={member.user.name}
                                                        size="xxs"
                                                    />
                                                    <PresenceIndicator
                                                        userId={member.user.id}
                                                        size="sm"
                                                        className="absolute -right-0.5 -bottom-0.5"
                                                        showOffline
                                                    />
                                                </span>
                                                <span className="block min-w-0 max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {member.user.name}
                                                </span>
                                                {conversation?.isUnread && (
                                                    <span className="size-1.5 shrink-0 rounded-full bg-ds-sidebar-text" />
                                                )}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}

                            {hasMembersData && members.length === 0 && (
                                <SidebarMenuItem>
                                    <div className="px-2 py-1 text-ds-sidebar-text-muted text-xs">
                                        {t("sidebar.membersEmpty", {
                                            defaultValue: "No members yet",
                                        })}
                                    </div>
                                </SidebarMenuItem>
                            )}

                            {hasMoreMembers && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link
                                            to={seeMoreHref}
                                            onClick={() =>
                                                onNavigationIntent(
                                                    seeMoreHref,
                                                    "click",
                                                    membersSectionLabel
                                                )
                                            }
                                            onFocus={() =>
                                                onNavigationIntent(
                                                    seeMoreHref,
                                                    "focus",
                                                    membersSectionLabel
                                                )
                                            }
                                            onPointerEnter={() =>
                                                onNavigationIntent(
                                                    seeMoreHref,
                                                    "hover",
                                                    membersSectionLabel
                                                )
                                            }
                                        >
                                            <span className="text-ds-sidebar-text-muted">
                                                {t("sidebar.membersSeeMore", {
                                                    defaultValue: "See more",
                                                })}
                                            </span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    )
}
