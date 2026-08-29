import { useId } from "react"
import { useTranslation } from "react-i18next"
import { useOrg } from "@/entities/organization"
import { getErrorMessage } from "@/shared/lib/error"
import { Field } from "@/shared/ui/field"
import { NativeSelect } from "@/shared/ui/native-select"
import { Skeleton } from "@/shared/ui/skeleton"
import { StackDescription, StackItem, StackTitle } from "@/shared/ui/stack"
import { ToastPill } from "@/shared/ui/toast-pill"
import { showPromiseToast } from "@/shared/ui/toasts"
import { useInvoiceLanguage } from "../api/subscription.api"
import { useUpdateInvoiceLanguage } from "../api/subscription.mutations"
import { getQueryErrorMessage } from "../lib/query-error"
import {
    INVOICE_LANGUAGE_OPTIONS,
    type InvoiceLanguage,
} from "../model/schemas/invoice-language.schema"

const DEFAULT_LANGUAGE: InvoiceLanguage = "en"

export function InvoiceLanguageCard() {
    const { t } = useTranslation("settings")
    const { t: tCommon } = useTranslation("common")
    const { state } = useOrg()
    const organizationId = state.org.id
    const {
        data,
        error,
        isLoading: isLanguageLoading,
        refetch,
    } = useInvoiceLanguage(organizationId)

    if (isLanguageLoading) return <InvoiceLanguageCardSkeleton />

    if (!data) {
        return (
            <StackItem className="flex items-center justify-center">
                <ToastPill
                    variant="error"
                    message={getQueryErrorMessage(error, t("invoiceLanguage.loadError"))}
                    action={{
                        label: tCommon("action.retry"),
                        onClick: () => {
                            void refetch()
                        },
                    }}
                    onDismiss={() => undefined}
                />
            </StackItem>
        )
    }

    return <InvoiceLanguageCardContent organizationId={organizationId} current={data.current} />
}

interface InvoiceLanguageCardContentProps {
    organizationId: string
    current: InvoiceLanguage | null
}

function InvoiceLanguageCardContent({ organizationId, current }: InvoiceLanguageCardContentProps) {
    const { t } = useTranslation("settings")
    const invoiceLanguageId = useId()
    const updateMutation = useUpdateInvoiceLanguage(organizationId)
    const value = current ?? DEFAULT_LANGUAGE

    const saveLanguage = (language: InvoiceLanguage) => {
        if (language === value || updateMutation.isPending) return

        const promise = updateMutation.mutateAsync(language)
        showPromiseToast(promise, {
            loading: t("invoiceLanguage.saving"),
            success: t("invoiceLanguage.toast.updated"),
            error: (err) => getErrorMessage(err, t("invoiceLanguage.toast.failed")),
        })
        promise.catch(() => {})
    }

    return (
        <StackItem className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
                <StackTitle>{t("invoiceLanguage.title")}</StackTitle>
                <StackDescription>{t("invoiceLanguage.descriptionLong")}</StackDescription>
            </div>
            <div className="w-full shrink-0 sm:w-auto">
                <Field className="w-full sm:w-[200px]">
                    <NativeSelect
                        id={invoiceLanguageId}
                        size="md"
                        value={value}
                        aria-label={t("invoiceLanguage.ariaLabel")}
                        disabled={updateMutation.isPending}
                        onChange={(event) => saveLanguage(event.target.value as InvoiceLanguage)}
                    >
                        {INVOICE_LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </NativeSelect>
                </Field>
            </div>
        </StackItem>
    )
}

function InvoiceLanguageCardSkeleton() {
    return (
        <StackItem className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-full sm:w-[200px]" />
        </StackItem>
    )
}
