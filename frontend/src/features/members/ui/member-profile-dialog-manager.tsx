import type { ActiveOrganization, SessionResponse } from "@/entities/session"
import { useMemberProfileDialog } from "../model/hooks/use-member-profile-dialog"
import { MemberProfileDialog } from "./member-profile-dialog"

interface MemberProfileDialogManagerProps {
    sessionData: SessionResponse | null
    activeOrganization: ActiveOrganization | null
    onOpenRequest?: (requestNumber: string) => void
    onNavigate?: (href: string) => void
    onStartMemberDm?: (targetUserId: string) => void
    onAddMemberToFavorites?: (target: {
        userId: string
        name: string
        image?: string | null
    }) => void
    onRemoveMemberFromFavorites?: (target: {
        userId: string
        name: string
        image?: string | null
    }) => void
    isMemberFavorite?: (targetUserId: string) => boolean
    isStartingMemberDm?: boolean
    isTogglingMemberFavorite?: boolean
}

export function MemberProfileDialogManager({
    sessionData,
    activeOrganization,
    onOpenRequest,
    onNavigate,
    onStartMemberDm,
    onAddMemberToFavorites,
    onRemoveMemberFromFavorites,
    isMemberFavorite,
    isStartingMemberDm,
    isTogglingMemberFavorite,
}: MemberProfileDialogManagerProps) {
    const { openProfileUserId, isOpen, closeProfile } = useMemberProfileDialog()

    if (!openProfileUserId) {
        return null
    }

    return (
        <MemberProfileDialog
            userId={openProfileUserId}
            isOpen={isOpen}
            onClose={closeProfile}
            onOpenRequest={onOpenRequest}
            sessionData={sessionData}
            activeOrganization={activeOrganization}
            onNavigate={onNavigate}
            onStartMemberDm={onStartMemberDm}
            onAddMemberToFavorites={onAddMemberToFavorites}
            onRemoveMemberFromFavorites={onRemoveMemberFromFavorites}
            isMemberFavorite={isMemberFavorite?.(openProfileUserId) ?? false}
            isStartingMemberDm={isStartingMemberDm}
            isTogglingMemberFavorite={isTogglingMemberFavorite}
        />
    )
}
