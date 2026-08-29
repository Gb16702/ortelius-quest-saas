import { useId, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Field, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { Spinner } from "@/shared/ui/spinner"

interface LeaveOrganizationDialogProps {
    isOpen: boolean
    organizationName: string
    isSubmitting: boolean
    onConfirm: () => void
    onClose: () => void
}

export const LeaveOrganizationDialog = ({
    isOpen,
    organizationName,
    isSubmitting,
    onConfirm,
    onClose,
}: LeaveOrganizationDialogProps) => {
    const { t } = useTranslation("account")
    const leaveOrgConfirmId = useId()
    const [typedName, setTypedName] = useState("")

    const canConfirm = typedName.trim() === organizationName.trim()

    const handleOpenChange = (open: boolean) => {
        if (open) return
        setTypedName("")
        onClose()
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {t("leaveOrganization.dialog.title", { organizationName })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("leaveOrganization.dialog.description")}
                    </AlertDialogDescription>
                    <Field className="mt-4 gap-2">
                        <FieldLabel htmlFor={leaveOrgConfirmId} className="text-sm">
                            <span>
                                <Trans
                                    i18nKey="leaveOrganization.dialog.confirmLabelPrefix"
                                    t={t}
                                />{" "}
                                <span className="font-semibold text-ds-fg">{organizationName}</span>{" "}
                                <Trans
                                    i18nKey="leaveOrganization.dialog.confirmLabelSuffix"
                                    t={t}
                                />
                            </span>
                        </FieldLabel>
                        <Input
                            id={leaveOrgConfirmId}
                            size="sm"
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            placeholder={organizationName}
                            disabled={isSubmitting}
                            autoComplete="off"
                        />
                    </Field>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={() => {
                            setTypedName("")
                            onClose()
                        }}
                        disabled={isSubmitting}
                    >
                        {t("leaveOrganization.dialog.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={!canConfirm || isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Spinner className="mr-2" />
                                {t("leaveOrganization.dialog.submitting")}
                            </>
                        ) : (
                            t("leaveOrganization.dialog.confirm")
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
