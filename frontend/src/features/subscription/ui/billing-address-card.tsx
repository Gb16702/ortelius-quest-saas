import {
    Form,
    Field as FormischField,
    getInput,
    reset,
    type SubmitEventHandler,
    setInput,
    useForm,
} from "@formisch/react"
import { useEffect, useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useOrg } from "@/entities/organization"
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
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { NativeSelect } from "@/shared/ui/native-select"
import { Skeleton } from "@/shared/ui/skeleton"
import { StackDescription, StackItem, StackTitle } from "@/shared/ui/stack"
import { ToastPill } from "@/shared/ui/toast-pill"
import { showPromiseToast } from "@/shared/ui/toasts"
import { useBillingAddress } from "../api/subscription.api"
import { useUpdateBillingAddress } from "../api/subscription.mutations"
import {
    createBillingAddressFormValues,
    getBillingAddressPlaceEntries,
    toUpdateBillingAddressInput,
} from "../lib/billing-address-form"
import { detectCountryCode } from "../lib/detect-country"
import { getQueryErrorMessage } from "../lib/query-error"
import { getCountries } from "../model/billing-countries"
import {
    type BillingAddressFormData,
    billingAddressSchema,
} from "../model/schemas/billing-address.schema"
import { GooglePlacesAutocomplete } from "./google-places-autocomplete"

interface CurrentBillingAddress {
    country: string
    line1: string
    line2: string | null
    city: string
    postalCode: string
    state: string | null
}

export function BillingAddressCard() {
    const { t } = useTranslation("settings")
    const { t: tCommon } = useTranslation("common")
    const { state } = useOrg()
    const organizationId = state.org.id
    const { data, error, isLoading: isAddressLoading, refetch } = useBillingAddress(organizationId)

    if (isAddressLoading) return <BillingAddressCardSkeleton />

    if (!data) {
        return (
            <StackItem className="flex items-center justify-center">
                <ToastPill
                    variant="error"
                    message={getQueryErrorMessage(error, t("billingAddress.loadError"))}
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

    return (
        <BillingAddressCardContent
            organizationId={organizationId}
            currentAddress={data.address ?? null}
        />
    )
}

interface BillingAddressCardContentProps {
    organizationId: string
    currentAddress: CurrentBillingAddress | null
}

function BillingAddressCardContent({
    organizationId,
    currentAddress,
}: BillingAddressCardContentProps) {
    const { t } = useTranslation("settings")
    const { t: tCommon } = useTranslation("common")
    const billingCountryId = useId()
    const billingLine1Id = useId()
    const billingLine2Id = useId()
    const billingPostalId = useId()
    const billingCityId = useId()
    const billingStateId = useId()
    const updateMutation = useUpdateBillingAddress(organizationId)
    const countries = useMemo(() => getCountries(), [])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [showFields, setShowFields] = useState(Boolean(currentAddress))
    const initialInput = useMemo(
        () => createBillingAddressFormValues(currentAddress),
        [currentAddress]
    )

    const form = useForm({
        schema: billingAddressSchema,
        initialInput,
        validate: "submit",
    })

    useEffect(() => {
        reset(form, { initialInput })
        setShowFields(Boolean(currentAddress))
    }, [form, initialInput, currentAddress])

    const selectedCountry = getInput(form, { path: ["country"] }) ?? ""

    useEffect(() => {
        if (currentAddress || selectedCountry) return
        const detected = detectCountryCode()
        if (detected && countries.some((c) => c.code === detected)) {
            setInput(form, { path: ["country"], input: detected })
        }
    }, [currentAddress, selectedCountry, countries, form])

    const onSubmit: SubmitEventHandler<typeof billingAddressSchema> = (formData) => {
        const promise = updateMutation.mutateAsync(toUpdateBillingAddressInput(formData)).then(
            (result) => {
                reset(form, { initialInput: createBillingAddressFormValues(result.address) })
                setIsDialogOpen(false)
                setShowFields(true)
                return result
            },
            (error: unknown) => {
                reset(form, { initialInput })
                throw error
            }
        )

        showPromiseToast(promise, {
            loading: t("billingAddress.saving"),
            success: t("billingAddress.toast.updated"),
            error: (error) => getErrorMessage(error, t("billingAddress.toast.failed")),
        })
        promise.catch(() => {})
    }

    const handlePlaceSelected = (place: Partial<BillingAddressFormData>) => {
        for (const { field, value } of getBillingAddressPlaceEntries(place)) {
            switch (field) {
                case "country":
                    setInput(form, { path: ["country"], input: value })
                    break
                case "line1":
                    setInput(form, { path: ["line1"], input: value })
                    break
                case "postalCode":
                    setInput(form, { path: ["postalCode"], input: value })
                    break
                case "city":
                    setInput(form, { path: ["city"], input: value })
                    break
                case "state":
                    setInput(form, { path: ["state"], input: value })
                    break
                case "line2":
                    setInput(form, { path: ["line2"], input: value })
                    break
            }
        }
        setShowFields(true)
    }

    const closeEditor = () => {
        reset(form, { initialInput })
        setShowFields(Boolean(currentAddress))
        setIsDialogOpen(false)
    }

    return (
        <StackItem className="overflow-visible">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <StackTitle>{t("billingAddress.title")}</StackTitle>
                    <StackDescription>{t("billingAddress.descriptionLong")}</StackDescription>
                    {currentAddress ? (
                        <address className="mt-2 text-ds-fg-muted text-xs not-italic leading-normal">
                            {formatBillingAddress(currentAddress)}
                        </address>
                    ) : null}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="md"
                    radius="full"
                    onClick={() => setIsDialogOpen(true)}
                >
                    {currentAddress ? t("billingAddress.edit") : t("billingAddress.add")}
                </Button>
            </div>
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (open) {
                        setIsDialogOpen(true)
                        return
                    }
                    closeEditor()
                }}
            >
                <DialogContent className="max-w-[620px]">
                    <DialogHeader>
                        <DialogTitle>{t("billingAddress.title")}</DialogTitle>
                        <DialogDescription>{t("billingAddress.descriptionLong")}</DialogDescription>
                    </DialogHeader>
                    <Form of={form} onSubmit={onSubmit}>
                        <DialogBody className="space-y-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:gap-x-3">
                                <FieldGroup className="w-full sm:w-2xs">
                                    <FormischField of={form} path={["country"]}>
                                        {(field) => (
                                            <Field data-invalid={field.errors !== null}>
                                                <FieldLabel htmlFor={billingCountryId}>
                                                    {t("billingAddress.country")}
                                                </FieldLabel>
                                                <NativeSelect
                                                    {...field.props}
                                                    id={billingCountryId}
                                                    size="md"
                                                    value={field.input ?? ""}
                                                    aria-invalid={field.errors !== null}
                                                >
                                                    <option value="">
                                                        {t("billingAddress.selectCountry")}
                                                    </option>
                                                    {countries.map((c) => (
                                                        <option key={c.code} value={c.code}>
                                                            {c.name}
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
                                </FieldGroup>

                                <Field className="w-full sm:w-2xs">
                                    <FieldTitle>{t("billingAddress.addressLabel")}</FieldTitle>
                                    <GooglePlacesAutocomplete
                                        countryCode={selectedCountry || undefined}
                                        onSelect={handlePlaceSelected}
                                        onManualEntry={() => setShowFields(true)}
                                        size="md"
                                    />
                                </Field>
                            </div>

                            {showFields ? (
                                <>
                                    <FormischField of={form} path={["line1"]}>
                                        {(field) => (
                                            <Field data-invalid={field.errors !== null}>
                                                <FieldLabel htmlFor={billingLine1Id}>
                                                    {t("billingAddress.addressLine1")}
                                                </FieldLabel>
                                                <Input
                                                    {...field.props}
                                                    id={billingLine1Id}
                                                    size="md"
                                                    value={field.input ?? ""}
                                                    aria-invalid={field.errors !== null}
                                                    placeholder={t(
                                                        "billingAddress.addressLine1Placeholder"
                                                    )}
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

                                    <FormischField of={form} path={["line2"]}>
                                        {(field) => (
                                            <Field>
                                                <FieldLabel htmlFor={billingLine2Id}>
                                                    {t("billingAddress.addressLine2")}{" "}
                                                    <span className="text-ds-fg-muted">
                                                        {t("billingAddress.optional")}
                                                    </span>
                                                </FieldLabel>
                                                <Input
                                                    {...field.props}
                                                    id={billingLine2Id}
                                                    size="md"
                                                    value={field.input ?? ""}
                                                    placeholder={t(
                                                        "billingAddress.addressLine2Placeholder"
                                                    )}
                                                />
                                            </Field>
                                        )}
                                    </FormischField>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <FormischField of={form} path={["postalCode"]}>
                                            {(field) => (
                                                <Field data-invalid={field.errors !== null}>
                                                    <FieldLabel htmlFor={billingPostalId}>
                                                        {t("billingAddress.postalCode")}
                                                    </FieldLabel>
                                                    <Input
                                                        {...field.props}
                                                        id={billingPostalId}
                                                        size="md"
                                                        value={field.input ?? ""}
                                                        aria-invalid={field.errors !== null}
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
                                        <FormischField of={form} path={["city"]}>
                                            {(field) => (
                                                <Field data-invalid={field.errors !== null}>
                                                    <FieldLabel htmlFor={billingCityId}>
                                                        {t("billingAddress.city")}
                                                    </FieldLabel>
                                                    <Input
                                                        {...field.props}
                                                        id={billingCityId}
                                                        size="md"
                                                        value={field.input ?? ""}
                                                        aria-invalid={field.errors !== null}
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
                                    </div>

                                    <FormischField of={form} path={["state"]}>
                                        {(field) => (
                                            <Field>
                                                <FieldLabel htmlFor={billingStateId}>
                                                    {t("billingAddress.stateRegion")}{" "}
                                                    <span className="text-ds-fg-muted">
                                                        {t("billingAddress.optional")}
                                                    </span>
                                                </FieldLabel>
                                                <Input
                                                    {...field.props}
                                                    id={billingStateId}
                                                    size="md"
                                                    value={field.input ?? ""}
                                                />
                                            </Field>
                                        )}
                                    </FormischField>
                                </>
                            ) : null}
                        </DialogBody>
                        <DialogFooter>
                            <DialogCancel size="md" onClick={closeEditor}>
                                {tCommon("action.cancel")}
                            </DialogCancel>
                            <DialogAction
                                type="submit"
                                size="md"
                                disabled={updateMutation.isPending}
                            >
                                {t("billingAddress.save")}
                            </DialogAction>
                        </DialogFooter>
                    </Form>
                </DialogContent>
            </Dialog>
        </StackItem>
    )
}

function formatBillingAddress(address: CurrentBillingAddress): string {
    return [
        address.line1,
        address.line2,
        `${address.postalCode} ${address.city}${address.state ? `, ${address.state}` : ""}`,
        address.country,
    ]
        .filter(Boolean)
        .join(", ")
}

function BillingAddressCardSkeleton() {
    return (
        <StackItem className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-9 w-36 rounded-full" />
        </StackItem>
    )
}
