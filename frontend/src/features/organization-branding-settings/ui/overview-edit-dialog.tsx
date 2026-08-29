import { Field as FormischField, handleSubmit } from "@formisch/react"
import { lazy, Suspense } from "react"
import { useTranslation } from "react-i18next"
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
import { useBrandingPage } from "../model/branding-page.provider"

const MarkdownEditor = lazy(() =>
    import("@/shared/ui/markdown-editor").then((module) => ({
        default: module.MarkdownEditor,
    }))
)

export function OverviewEditDialog() {
    const { t } = useTranslation("settings")
    const { state, actions } = useBrandingPage()
    const { showOverviewDialog, overviewForm } = state

    const handleOpenChange = (open: boolean) => {
        if (!open) actions.closeOverviewDialog()
    }

    return (
        <Dialog open={showOverviewDialog} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-[760px]">
                <DialogHeader className="border-ds-surface-border border-b">
                    <DialogTitle>{t("branding.overview.dialogTitle")}</DialogTitle>
                    <DialogDescription>{t("branding.overview.description")}</DialogDescription>
                </DialogHeader>
                <DialogBody>
                    {showOverviewDialog ? (
                        <Suspense fallback={<OverviewEditorFallback />}>
                            <FormischField of={overviewForm} path={["overview"]}>
                                {(field) => (
                                    <Field data-invalid={field.errors !== null}>
                                        <MarkdownEditor
                                            value={field.input ?? ""}
                                            onChange={field.onChange}
                                            maxLength={2000}
                                            placeholder={t("branding.overview.placeholder")}
                                        />
                                        {field.errors && (
                                            <FieldError
                                                errors={field.errors.map((message) => ({
                                                    message,
                                                }))}
                                            />
                                        )}
                                    </Field>
                                )}
                            </FormischField>
                        </Suspense>
                    ) : null}
                </DialogBody>
                <DialogFooter>
                    <DialogCancel onClick={actions.closeOverviewDialog}>
                        {t("common:action.cancel")}
                    </DialogCancel>
                    <DialogAction
                        onClick={() => {
                            if (!overviewForm.isDirty) {
                                actions.closeOverviewDialog()
                                return
                            }
                            void handleSubmit(overviewForm, actions.saveOverview)()
                        }}
                    >
                        {t("common:action.save")}
                    </DialogAction>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function OverviewEditorFallback() {
    return (
        <div className="overflow-hidden rounded-sm border border-ds-surface-border">
            <div className="flex items-center gap-0.5 border-ds-surface-border border-b bg-ds-surface px-1 py-1">
                <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
                <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
                <div className="mx-0.5 h-4 w-px bg-ds-surface-border" />
                <div className="h-8 w-[130px] animate-pulse rounded-sm bg-ds-gray-200" />
                <div className="mx-0.5 h-4 w-px bg-ds-surface-border" />
                <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
                <div className="size-8 animate-pulse rounded-sm bg-ds-gray-200" />
            </div>
            <div className="h-[320px] animate-pulse bg-ds-surface" />
            <div className="flex items-center justify-center border-ds-surface-border border-t px-3 py-2.5">
                <div className="h-3 w-28 animate-pulse rounded-sm bg-ds-gray-200" />
            </div>
        </div>
    )
}
