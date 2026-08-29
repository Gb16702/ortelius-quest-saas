export interface AssignDialogMember {
    id: string
    name: string
    email: string
    image: string | null
    role: string
}

interface RequestAssignableMemberInput {
    role: string
    user?: {
        id?: string | null
        name?: string | null
        email?: string | null
        image?: string | null
    } | null
}

export function toAssignDialogMembers(
    members: readonly RequestAssignableMemberInput[] | null | undefined
): AssignDialogMember[] {
    return (members || [])
        .map((member) => ({
            id: member.user?.id || "",
            name: member.user?.name || "Unknown",
            email: member.user?.email || "",
            image: member.user?.image || null,
            role: member.role,
        }))
        .filter(
            (member): member is AssignDialogMember =>
                Boolean(member.id) && member.name !== "Unknown"
        )
}
