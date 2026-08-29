import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    Dialog,
    DialogAction,
    DialogBody,
    DialogCancel,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { useLegalDocumentsContext } from "../model/legal-documents.provider"

export function LegalDocumentRenameDialog() {
    const { t } = useTranslation("settings")
    const { state, actions } = useLegalDocumentsContext()
    const labelId = useId()
    const [label, setLabel] = useState("")
    const [touched, setTouched] = useState(false)

    const target = state.renameTarget

    useEffect(() => {
        if (target) {
            setLabel(target.label)
            setTouched(false)
        }
    }, [target])

    const trimmed = label.trim()
    const isInvalid = trimmed.length === 0 || trimmed.length > 255
    const showError = touched && isInvalid

    const handleOpenChange = (open: boolean) => {
        if (!open) actions.closeRenameDialog()
    }

    const handleSubmit = () => {
        setTouched(true)
        if (isInvalid) return
        actions.confirmRename(trimmed)
    }

    return (
        <Dialog open={!!target} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader className="border-ds-surface-border border-b">
                    <DialogTitle>{t("legalDocuments.rename.title")}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Field data-invalid={showError}>
                        <FieldLabel htmlFor={labelId} className="sr-only">
                            {t("legalDocuments.upload.labelPlaceholder")}
                        </FieldLabel>
                        <Input
                            id={labelId}
                            value={label}
                            onChange={(event) => {
                                setLabel(event.target.value)
                                setTouched(true)
                            }}
                            maxLength={255}
                            placeholder={t("legalDocuments.upload.labelPlaceholder")}
                            aria-invalid={showError}
                            autoFocus
                        />
                        {showError && (
                            <FieldError>{t("legalDocuments.rename.required")}</FieldError>
                        )}
                    </Field>
                </DialogBody>
                <DialogFooter>
                    <DialogCancel onClick={actions.closeRenameDialog}>
                        {t("legalDocuments.dialog.cancel")}
                    </DialogCancel>
                    <DialogAction onClick={handleSubmit} disabled={isInvalid}>
                        {t("legalDocuments.dialog.save")}
                    </DialogAction>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
