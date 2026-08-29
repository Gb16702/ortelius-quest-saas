import { useMemo, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import * as v from "valibot"
import { ROLE_OPTIONS_WITH_DESCRIPTION } from "@/entities/access"
import type { Invitation } from "@/entities/invitation"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
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
import { Field, FieldError } from "@/shared/ui/field"
import { Spinner } from "@/shared/ui/spinner"
import { RoleRadioGroup } from "./role-radio-group"

const editInvitationRoleSchema = v.object({
    role: v.pipe(v.string(), v.minLength(1, "Please select a role.")),
})

interface EditInvitationRoleDialogProps {
    isOpen: boolean
    invitation: Invitation | null
    selectedRole: string
    onClose: () => void
    onRoleChange: (role: string) => void
    onConfirm: () => void
    isSubmitting: boolean
}

export const EditInvitationRoleDialog = ({
    isOpen,
    invitation,
    selectedRole,
    onClose,
    onRoleChange,
    onConfirm,
    isSubmitting,
}: EditInvitationRoleDialogProps) => {
    const { t } = useTranslation("team")
    const { t: tCommon } = useTranslation("common")
    const [error, setError] = useState<string | null>(null)
    const radioGroupRef = useRef<HTMLDivElement>(null)
    const translatedRoleOptions = useMemo(
        () =>
            ROLE_OPTIONS_WITH_DESCRIPTION.map((option) => ({
                ...option,
                label: tCommon(`role.${option.value}`, { defaultValue: option.label }),
            })),
        [tCommon]
    )

    if (!invitation) {
        return null
    }

    const onSelectRole = (role: string) => {
        onRoleChange(role)
        if (error) setError(null)
    }

    const submitRoleChange = () => {
        const parsed = safeParseSchema(editInvitationRoleSchema, { role: selectedRole })
        if (!parsed.success) {
            setError(t("editInvitationRoleDialog.errors.selectRole"))
            const firstRadio =
                radioGroupRef.current?.querySelector<HTMLButtonElement>('[role="radio"]')
            firstRadio?.focus()
            return
        }
        setError(null)
        onConfirm()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader className="border-b">
                    <DialogTitle>{t("editInvitationRoleDialog.title")}</DialogTitle>
                    <DialogDescription>
                        <Trans
                            i18nKey="editInvitationRoleDialog.description"
                            t={t}
                            values={{ email: invitation.email }}
                            components={{
                                strong: <strong className="font-medium text-ds-fg" />,
                            }}
                        />
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-3">
                    <Field ref={radioGroupRef} data-invalid={!!error}>
                        <RoleRadioGroup
                            value={selectedRole}
                            onValueChange={onSelectRole}
                            options={translatedRoleOptions}
                            disabled={isSubmitting}
                        />
                        {error && <FieldError>{error}</FieldError>}
                    </Field>
                </DialogBody>

                <DialogFooter>
                    <DialogCancel size="lg" type="button" onClick={onClose}>
                        {t("editInvitationRoleDialog.close")}
                    </DialogCancel>
                    <DialogAction
                        size="lg"
                        type="button"
                        onClick={submitRoleChange}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner className="mr-2" />
                                {t("editInvitationRoleDialog.updating")}
                            </>
                        ) : (
                            t("editInvitationRoleDialog.update")
                        )}
                    </DialogAction>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
