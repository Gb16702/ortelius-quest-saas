import {
    Form,
    Field as FormischField,
    getInput,
    reset,
    type SubmitEventHandler,
    type SubmitHandler,
    useForm,
} from "@formisch/react"
import { useEffect, useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    TAX_ID_OPTIONS,
    TAX_ID_PLACEHOLDERS,
    taxIdSchema,
    useOrg,
    useOrganizationBillingSettings,
} from "@/entities/organization"
import { getErrorMessage } from "@/shared/lib/error"
import { Button } from "@/shared/ui/button"
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
import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { NativeSelect } from "@/shared/ui/native-select"
import { Skeleton } from "@/shared/ui/skeleton"
import { StackDescription, StackItem, StackTitle } from "@/shared/ui/stack"
import { showPromiseToast } from "@/shared/ui/toasts"
import { useUpdateTaxId } from "../api/subscription.mutations"

export function TaxInformationCard() {
    const { state } = useOrg()
    const orgId = state.org.id
    const { data, isLoading } = useOrganizationBillingSettings(orgId)

    if (isLoading || !data) return <TaxInformationCardSkeleton />

    return (
        <TaxInformationCardContent
            orgId={orgId}
            taxIdType={data.taxIdType ?? ""}
            taxIdNumber={data.taxIdNumber ?? ""}
        />
    )
}

interface TaxInformationCardContentProps {
    orgId: string
    taxIdType: string
    taxIdNumber: string
}

function TaxInformationCardContent({
    orgId,
    taxIdType,
    taxIdNumber,
}: TaxInformationCardContentProps) {
    const { t } = useTranslation("settings")
    const { t: tCommon } = useTranslation("common")
    const taxIdTypeId = useId()
    const taxIdNumberId = useId()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const updateMutation = useUpdateTaxId(orgId)
    const initialInput = useMemo(() => ({ taxIdType, taxIdNumber }), [taxIdType, taxIdNumber])
    const hasTaxInformation = Boolean(taxIdType && taxIdNumber)

    const form = useForm({
        schema: taxIdSchema,
        initialInput,
        validate: "submit",
    })

    useEffect(() => {
        reset(form, { initialInput })
    }, [form, initialInput])

    const selectedTaxIdType = getInput(form, { path: ["taxIdType"] }) ?? ""

    const closeDialog = () => {
        reset(form, { initialInput })
        setIsDialogOpen(false)
    }

    const saveTaxInformation: SubmitHandler<typeof taxIdSchema> = (formData) => {
        if (formData.taxIdType === taxIdType && formData.taxIdNumber.trim() === taxIdNumber) {
            closeDialog()
            return
        }

        const nextInput = {
            taxIdNumber: formData.taxIdNumber.trim(),
            taxIdType: formData.taxIdType,
        }

        const promise = updateMutation
            .mutateAsync({
                taxIdNumber: nextInput.taxIdNumber || null,
                taxIdType: nextInput.taxIdType || null,
            })
            .then(
                (result) => {
                    reset(form, { initialInput: nextInput })
                    setIsDialogOpen(false)
                    return result
                },
                (error: unknown) => {
                    throw error
                }
            )

        showPromiseToast(promise, {
            loading: t("taxInformation.saving"),
            success: t("taxInformation.toast.updated"),
            error: (error) => getErrorMessage(error, t("taxInformation.toast.failed")),
        })
        promise.catch(() => {})
    }

    const onSubmit: SubmitEventHandler<typeof taxIdSchema> = (formData) => {
        return saveTaxInformation(formData)
    }

    return (
        // biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation
        <StackItem
            id="vat"
            className="flex scroll-mt-6 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="min-w-0 space-y-1">
                <StackTitle>{t("taxInformation.title")}</StackTitle>
                <StackDescription>{t("taxInformation.description")}</StackDescription>
            </div>
            <div className="shrink-0">
                <Button
                    type="button"
                    variant="outline"
                    size="md"
                    radius="full"
                    onClick={() => setIsDialogOpen(true)}
                >
                    {hasTaxInformation ? t("taxInformation.edit") : t("taxInformation.add")}
                </Button>
            </div>
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (open) {
                        setIsDialogOpen(true)
                        return
                    }
                    closeDialog()
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("taxInformation.dialogTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("taxInformation.dialogDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <Form of={form} onSubmit={onSubmit}>
                        <DialogBody className="space-y-5">
                            <FormischField of={form} path={["taxIdType"]}>
                                {(field) => (
                                    <Field data-invalid={field.errors !== null}>
                                        <FieldLabel htmlFor={taxIdTypeId}>
                                            {t("taxInformation.typeLabel")}
                                        </FieldLabel>
                                        <NativeSelect
                                            {...field.props}
                                            id={taxIdTypeId}
                                            size="md"
                                            value={field.input ?? ""}
                                            aria-invalid={field.errors !== null}
                                            disabled={updateMutation.isPending}
                                        >
                                            <option value="">
                                                {t("taxInformation.typePlaceholder")}
                                            </option>
                                            {TAX_ID_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </NativeSelect>
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
                            <FormischField of={form} path={["taxIdNumber"]}>
                                {(field) => (
                                    <Field data-invalid={field.errors !== null}>
                                        <FieldLabel htmlFor={taxIdNumberId}>
                                            {t("taxInformation.numberLabel")}
                                        </FieldLabel>
                                        <Input
                                            {...field.props}
                                            id={taxIdNumberId}
                                            type="text"
                                            size="md"
                                            value={field.input ?? ""}
                                            aria-invalid={field.errors !== null}
                                            disabled={updateMutation.isPending}
                                            placeholder={
                                                selectedTaxIdType &&
                                                TAX_ID_PLACEHOLDERS[selectedTaxIdType]
                                                    ? TAX_ID_PLACEHOLDERS[selectedTaxIdType]
                                                    : t("taxInformation.numberPlaceholder")
                                            }
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
                        </DialogBody>
                        <DialogFooter>
                            <DialogCancel size="md" onClick={closeDialog}>
                                {tCommon("action.cancel")}
                            </DialogCancel>
                            <DialogAction
                                type="submit"
                                size="md"
                                disabled={updateMutation.isPending}
                            >
                                {t("taxInformation.save")}
                            </DialogAction>
                        </DialogFooter>
                    </Form>
                </DialogContent>
            </Dialog>
        </StackItem>
    )
}

function TaxInformationCardSkeleton() {
    return (
        // biome-ignore lint/correctness/useUniqueElementIds: stable anchor id for in-page navigation
        <StackItem
            id="vat"
            className="flex scroll-mt-6 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-52" />
            </div>
            <Skeleton className="h-9 w-32 rounded-full" />
        </StackItem>
    )
}
