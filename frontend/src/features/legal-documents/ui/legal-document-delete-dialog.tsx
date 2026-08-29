import { useTranslation } from "react-i18next"
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
import { useLegalDocumentsContext } from "../model/legal-documents.provider"

export function LegalDocumentDeleteDialog() {
    const { t } = useTranslation("settings")
    const { state, actions } = useLegalDocumentsContext()
    const target = state.deleteTarget

    const handleOpenChange = (open: boolean) => {
        if (!open) actions.closeDeleteDialog()
    }

    return (
        <AlertDialog open={!!target} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("legalDocuments.delete.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {target
                            ? t("legalDocuments.delete.descriptionWithLabel", {
                                  label: target.label,
                              })
                            : t("legalDocuments.delete.description")}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={actions.closeDeleteDialog}>
                        {t("legalDocuments.dialog.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={actions.confirmDelete}>
                        {t("legalDocuments.table.delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
