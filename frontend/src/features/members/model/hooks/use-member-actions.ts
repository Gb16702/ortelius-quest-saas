import { useCallback } from "react"
import { getRoleLevel, isAdminOrOwner, parseRole } from "@/entities/access"
import type { Invitation } from "@/entities/invitation"
import type { OrganizationMember } from "@/entities/member"

interface MemberActionsHookProps {
    currentUserId: string
    currentUserRole: string
    updateEditMember: (id: string) => void
    updateRemoveMember: (id: string) => void
    updateInvitationModal: (id: string) => void
    activeOrganizationId: string
}

interface MemberActionsReturn {
    canInviteMembers: () => boolean
    canPerformAction: (memberRole: string, memberId: string) => boolean
    calculateRoleLevel: (role: string) => number
    editRole: (member: OrganizationMember) => void
    removeMember: (member: OrganizationMember) => void
    editInvitationRole: (invitation: Invitation) => void
}

export function useMemberActions({
    currentUserId,
    currentUserRole,
    updateEditMember,
    updateRemoveMember,
    updateInvitationModal,
    // biome-ignore lint/correctness/noUnusedFunctionParameters: parameter is part of externally-imposed component/hook props signature
    activeOrganizationId,
}: MemberActionsHookProps): MemberActionsReturn {
    const parsedRole = parseRole(currentUserRole)

    const canInviteMembers = useCallback(() => {
        return parsedRole ? isAdminOrOwner(parsedRole) : false
    }, [parsedRole])

    const calculateRoleLevel = useCallback((role: string): number => {
        const parsed = parseRole(role)
        return parsed ? getRoleLevel(parsed) : 0
    }, [])

    const canPerformAction = useCallback(
        (_memberRole: string, memberId: string): boolean => {
            if (memberId === currentUserId) return false
            return parsedRole ? isAdminOrOwner(parsedRole) : false
        },
        [currentUserId, parsedRole]
    )

    const editRole = useCallback(
        (member: OrganizationMember) => {
            updateEditMember(member.id)
        },
        [updateEditMember]
    )

    const removeMember = useCallback(
        (member: OrganizationMember) => {
            updateRemoveMember(member.id)
        },
        [updateRemoveMember]
    )

    const editInvitationRole = useCallback(
        (invitation: Invitation) => {
            updateInvitationModal(invitation.id)
        },
        [updateInvitationModal]
    )

    return {
        canInviteMembers,
        canPerformAction,
        calculateRoleLevel,
        editRole,
        removeMember,
        editInvitationRole,
    }
}
