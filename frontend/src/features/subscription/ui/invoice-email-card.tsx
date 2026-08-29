import {
    Form,
    Field as FormischField,
    handleSubmit,
    reset,
    type SubmitEventHandler,
    type SubmitHandler,
    useForm,
} from "@formisch/react"
import { useEffect, useId, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useOrg } from "@/entities/organization"
import { getErrorMessage } from "@/shared/lib/error"
import { Field, FieldError } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"
import { StackDescription, StackItem, StackTitle } from "@/shared/ui/stack"
import { ToastPill } from "@/shared/ui/toast-pill"
import { showPromiseToast } from "@/shared/ui/toasts"
import { useInvoiceEmail } from "../api/subscription.api"
import { useUpdateInvoiceEmail } from "../api/subscription.mutations"
import { getQueryErrorMessage } from "../lib/query-error"
import { invoiceEmailFormSchema } from "../model/schemas/invoice-email.schema"

export function InvoiceEmailCard() {
    const { t } = useTranslation("settings")
    const { t: tCommon } = useTranslation("common")
    const { state } = useOrg()
    const organizationId = state.org.id
    const { data, error, isLoading: isEmailLoading, refetch } = useInvoiceEmail(organizationId)

    if (isEmailLoading) return <InvoiceEmailCardSkeleton />

    if (!data) {
        return (
            <StackItem className="flex items-center justify-center">
                <ToastPill
                    variant="error"
                    message={getQueryErrorMessage(error, t("invoiceEmail.loadError"))}
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

    return <InvoiceEmailCardContent organizationId={organizationId} current={data.current} />
}

interface InvoiceEmailCardContentProps {
    organizationId: string
    current: string | null
}

function InvoiceEmailCardContent({ organizationId, current }: InvoiceEmailCardContentProps) {
    const { t } = useTranslation("settings")
    const invoiceEmailId = useId()
    const updateMutation = useUpdateInvoiceEmail(organizationId)
    const initialInput = useMemo(() => ({ email: current ?? "" }), [current])

    const form = useForm({
        schema: invoiceEmailFormSchema,
        initialInput,
        validate: "submit",
    })

    useEffect(() => {
        reset(form, { initialInput })
    }, [form, initialInput])

    const saveEmail: SubmitHandler<typeof invoiceEmailFormSchema> = (formData) => {
        const email = formData.email.trim()
        if (email === (current ?? "")) return

        const promise = updateMutation.mutateAsync(email).then(
            (result) => {
                reset(form, { initialInput: { email: result.email } })
                return result
            },
            (error: unknown) => {
                reset(form, { initialInput })
                throw error
            }
        )

        showPromiseToast(promise, {
            loading: t("invoiceEmail.saving"),
            success: t("invoiceEmail.toast.updated"),
            error: (err) => getErrorMessage(err, t("invoiceEmail.toast.failed")),
        })
        promise.catch(() => {})
    }

    const onSubmit: SubmitEventHandler<typeof invoiceEmailFormSchema> = (formData) => {
        return saveEmail(formData)
    }

    const submitIfDirty = () => {
        if (!form.isDirty || updateMutation.isPending) return
        void handleSubmit(form, saveEmail)()
    }

    return (
        <StackItem>
            <Form
                of={form}
                onSubmit={onSubmit}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="min-w-0 space-y-1">
                    <StackTitle>{t("invoiceEmail.title")}</StackTitle>
                    <StackDescription>{t("invoiceEmail.descriptionLong")}</StackDescription>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto">
                    <FormischField of={form} path={["email"]}>
                        {(field) => (
                            <Field
                                data-invalid={field.errors !== null}
                                className="w-full sm:w-[200px]"
                            >
                                <Input
                                    {...field.props}
                                    id={invoiceEmailId}
                                    type="email"
                                    size="md"
                                    autoComplete="email"
                                    placeholder={t("invoiceEmail.placeholder")}
                                    maxLength={264}
                                    value={field.input ?? ""}
                                    aria-label={t("invoiceEmail.title")}
                                    aria-invalid={field.errors !== null}
                                    onBlur={(event) => {
                                        field.props.onBlur(event)
                                        submitIfDirty()
                                    }}
                                />
                                {field.errors && (
                                    <FieldError
                                        errors={field.errors.map((message) => ({ message }))}
                                    />
                                )}
                            </Field>
                        )}
                    </FormischField>
                </div>
            </Form>
        </StackItem>
    )
}

function InvoiceEmailCardSkeleton() {
    return (
        <StackItem className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-9 w-full sm:w-[200px]" />
        </StackItem>
    )
}
