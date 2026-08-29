import { useTranslation } from "react-i18next"
import { PresenceIndicator } from "@/entities/presence"
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/shared/ui/command"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import type { MentionResult } from "../model/hooks/use-mentions"

interface RoleItem {
    id: string
    name: string
    label: string
}

interface MemberItem {
    id: string
    name: string
    image?: string | null
    role?: string
}

interface MentionCommandProps {
    roles: RoleItem[]
    members: MemberItem[]
    selectedValue: string
    query: string
    onSelect: (mention: MentionResult) => void
}

export function MentionCommand({
    roles,
    members,
    selectedValue,
    query,
    onSelect,
}: MentionCommandProps) {
    const { t } = useTranslation("chat")
    const hasResults = roles.length > 0 || members.length > 0

    if (!hasResults) {
        return null
    }

    const roleDescriptions: Record<string, string> = {
        owner: t("mention.roleDescription.owner"),
        admin: t("mention.roleDescription.admin"),
        member: t("mention.roleDescription.member"),
    }

    const membersHeading = query ? t("mention.membersMatching", { query }) : t("mention.members")
    const rolesHeading = query ? t("mention.rolesMatching", { query }) : t("mention.roles")

    const handleSelectRole = (role: RoleItem) => {
        onSelect({
            type: "role",
            id: role.id,
            name: role.name,
            displayName: `@${role.name}`,
        })
    }

    const handleSelectMember = (member: MemberItem) => {
        onSelect({
            type: "user",
            id: member.id,
            name: member.name,
            displayName: `@${member.name}`,
            image: member.image,
        })
    }

    return (
        <Command
            className="rounded-sm border border-ds-surface-border bg-ds-surface"
            shouldFilter={false}
            value={selectedValue}
        >
            <CommandList>
                {members.length > 0 && (
                    <CommandGroup heading={membersHeading}>
                        {members.map((member) => (
                            <CommandItem
                                key={member.id}
                                value={`member-${member.id}`}
                                onSelect={() => handleSelectMember(member)}
                                className="justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <GeneratedAvatar
                                            fallbackText={member.name}
                                            src={member.image}
                                            size="sm"
                                        />
                                        <PresenceIndicator
                                            userId={member.id}
                                            size="md"
                                            className="absolute -right-0.5 -bottom-0.5"
                                        />
                                    </div>
                                    <span>{member.name}</span>
                                </div>
                                {member.role && (
                                    <span className="text-ds-fg-subtle text-xs capitalize">
                                        {member.role}
                                    </span>
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {members.length > 0 && roles.length > 0 && <CommandSeparator />}

                {roles.length > 0 && (
                    <CommandGroup heading={rolesHeading}>
                        {roles.map((role) => (
                            <CommandItem
                                key={role.id}
                                value={`role-${role.id}`}
                                onSelect={() => handleSelectRole(role)}
                                className="justify-between"
                            >
                                <span>@{role.label}</span>
                                <span className="text-ds-fg-muted text-xs">
                                    {roleDescriptions[role.id]}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </Command>
    )
}
