import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { ROLE_OPTIONS_WITH_DESCRIPTION } from "@/entities/access"
import type { OrganizationMember } from "@/entities/member"
import {
    Dialog,
    DialogAction,
    DialogBody,
    DialogCancel,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Spinner } from "@/shared/ui/spinner"
import { RoleRadioGroup } from "./role-radio-group"

interface EditMemberRoleDialogProps {
    isOpen: boolean
    member: OrganizationMember | null
    selectedRole: string
    onClose: () => void
    onRoleChange: (role: string) => void
    onConfirm: () => void
    isSubmitting: boolean
}

export const EditMemberRoleDialog = ({
    isOpen,
    member,
    selectedRole,
    onClose,
    onRoleChange,
    onConfirm,
    isSubmitting,
}: EditMemberRoleDialogProps) => {
    const { t } = useTranslation("team")
    const { t: tCommon } = useTranslation("common")
    const translatedRoleOptions = useMemo(
        () =>
            ROLE_OPTIONS_WITH_DESCRIPTION.map((option) => ({
                ...option,
                label: tCommon(`role.${option.value}`, { defaultValue: option.label }),
            })),
        [tCommon]
    )

    if (!member) {
        return null
    }

    const currentRole = member.role

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader className="border-b">
                    <DialogTitle>{t("editRoleDialog.title")}</DialogTitle>
                    <DialogDescription>
                        <Trans
                            i18nKey="editRoleDialog.description"
                            t={t}
                            values={{ name: member.user.name }}
                            components={{
                                strong: <strong className="font-medium text-ds-fg" />,
                            }}
                        />
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-3">
                    <div>
                        <RoleRadioGroup
                            value={selectedRole}
                            onValueChange={onRoleChange}
                            options={translatedRoleOptions}
                            disabled={isSubmitting}
                            legend={t("editRoleDialog.legend")}
                        />
                    </div>
                </DialogBody>

                <DialogFooter>
                    <DialogCancel size="lg" type="button" onClick={onClose}>
                        {t("editRoleDialog.close")}
                    </DialogCancel>
                    <DialogAction
                        size="lg"
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting || selectedRole === currentRole || !selectedRole}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner className="mr-2" />
                                {t("editRoleDialog.updating")}
                            </>
                        ) : (
                            t("editRoleDialog.update")
                        )}
                    </DialogAction>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
