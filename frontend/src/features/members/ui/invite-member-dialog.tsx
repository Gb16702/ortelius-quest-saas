import { useTranslation } from "react-i18next"
import type { AssignableRole } from "@/entities/access"
import type { InviteForm } from "@/entities/invitation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { InviteMemberDialogContent } from "./invite-member-dialog-content"

interface InviteMemberDialogProps {
    isOpen: boolean
    onClose: () => void
    organizationId: string
    isInviting: boolean
    availableRoles: { value: AssignableRole; label: string }[]
    onInviteSubmit: (forms: InviteForm[]) => void | Promise<void>
}

export function InviteMemberDialog({
    isOpen,
    onClose,
    organizationId,
    isInviting,
    availableRoles,
    onInviteSubmit,
}: InviteMemberDialogProps) {
    const { t } = useTranslation("team")
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[80vh]">
                <DialogHeader className="border-b">
                    <DialogTitle>{t("inviteDialog.title")}</DialogTitle>
                    <DialogDescription>{t("inviteDialog.description")}</DialogDescription>
                </DialogHeader>

                <InviteMemberDialogContent
                    onClose={onClose}
                    organizationId={organizationId}
                    isInviting={isInviting}
                    availableRoles={availableRoles}
                    onInviteSubmit={onInviteSubmit}
                />
            </DialogContent>
        </Dialog>
    )
}
