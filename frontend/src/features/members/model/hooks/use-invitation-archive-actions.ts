import type { RowSelectionState } from "@tanstack/react-table"
import type { Dispatch, SetStateAction } from "react"
import type { Invitation } from "@/entities/invitation"
import {
    useArchiveInvitation,
    useBulkArchiveInvitations,
    useBulkUnarchiveInvitations,
    useUnarchiveInvitation,
} from "../../api/member-invitation-archive.mutations"
import { useInvitationArchiveAction } from "./use-invitation-archive-action"
import { useInvitationUnarchiveAction } from "./use-invitation-unarchive-action"

interface UseInvitationArchiveActionsOptions {
    organizationId: string
    rowSelection: RowSelectionState
    setRowSelection: Dispatch<SetStateAction<RowSelectionState>>
}

interface UseInvitationArchiveActionsResult {
    archiveInvitation: (invitation: Invitation) => void
    unarchiveInvitation: (invitation: Invitation) => void
    isArchiving: boolean
    isUnarchiving: boolean
}

export function useInvitationArchiveActions({
    organizationId,
    rowSelection,
    setRowSelection,
}: UseInvitationArchiveActionsOptions): UseInvitationArchiveActionsResult {
    const archiveInvitationMutation = useArchiveInvitation(organizationId)
    const unarchiveInvitationMutation = useUnarchiveInvitation(organizationId)
    const bulkArchiveMutation = useBulkArchiveInvitations(organizationId)
    const bulkUnarchiveMutation = useBulkUnarchiveInvitations(organizationId)

    const archiveAction = useInvitationArchiveAction({
        rowSelection,
        setRowSelection,
        archiveInvitationMutation,
        unarchiveInvitationMutation,
        bulkArchiveMutation,
        bulkUnarchiveMutation,
    })
    const unarchiveAction = useInvitationUnarchiveAction({
        rowSelection,
        setRowSelection,
        archiveInvitationMutation,
        unarchiveInvitationMutation,
        bulkArchiveMutation,
        bulkUnarchiveMutation,
    })

    return {
        ...archiveAction,
        ...unarchiveAction,
    }
}
