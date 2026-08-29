import {
    Form,
    Field as FormischField,
    getInput,
    type SubmitEventHandler,
    setInput,
    useForm,
} from "@formisch/react"
import { Link } from "@tanstack/react-router"
import { Image } from "@unpic/react"
import { Check } from "lucide-react"
import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import * as v from "valibot"
import { Button } from "@/shared/ui/button"
import { CountrySelect } from "@/shared/ui/country-select"
import { DottedLines } from "@/shared/ui/dotted-lines"
import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { NativeSelect } from "@/shared/ui/native-select"
import { Spinner } from "@/shared/ui/spinner"
import { Textarea } from "@/shared/ui/textarea"
import { useMarketingSession } from "@/widgets/marketing-layout"

export function MarketingContactPage() {
    const emailId = useId()
    const fullNameId = useId()
    const countryId = useId()
    const websiteId = useId()
    const companySizeId = useId()
    const messageId = useId()
    const { t } = useTranslation()
    const { lang, session } = useMarketingSession()
    const [isDemoRequest, setIsDemoRequest] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const userEmail = session?.user?.email ?? ""
    const userFullName = session?.user?.name ?? ""

    const contactSchema = v.object({
        email: v.pipe(
            v.string(),
            v.minLength(1, t("contact.form.validation.emailRequired")),
            v.email(t("contact.form.validation.emailInvalid"))
        ),
        fullName: v.pipe(
            v.string(),
            v.minLength(1, t("contact.form.validation.fullNameRequired")),
            v.minLength(2, t("contact.form.validation.fullNameMin"))
        ),
        country: v.pipe(v.string(), v.minLength(1, t("contact.form.validation.countryRequired"))),
        website: v.union([
            v.pipe(v.string(), v.url(t("contact.form.validation.websiteInvalid"))),
            v.literal(""),
        ]),
        companySize: v.string(),
        message: v.pipe(v.string(), v.minLength(1, t("contact.form.validation.messageRequired"))),
    })

    const form = useForm({
        schema: contactSchema,
        initialInput: {
            email: userEmail,
            fullName: userFullName,
            country: "",
            website: "",
            companySize: "",
            message: "",
        },
        validate: "submit",
    })

    const countryValue = getInput(form, { path: ["country"] }) ?? ""

    useEffect(() => {
        setIsDemoRequest(isDemoSearchRequest())
    }, [])

    useEffect(() => {
        if (isDemoRequest) {
            setInput(form, { path: ["message"], input: t("contact.form.defaultMessage") })
        }
    }, [form, isDemoRequest, t])

    useEffect(() => {
        if (userEmail && !getInput(form, { path: ["email"] })) {
            setInput(form, { path: ["email"], input: userEmail })
        }
    }, [form, userEmail])

    useEffect(() => {
        if (userFullName && !getInput(form, { path: ["fullName"] })) {
            setInput(form, { path: ["fullName"], input: userFullName })
        }
    }, [form, userFullName])

    const onSubmit: SubmitEventHandler<typeof contactSchema> = async (data) => {
        const response = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            throw new Error("Failed to submit")
        }
        setIsSuccess(true)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-ds-canvas pb-20 md:pt-16">
            <Image
                src="/assets/effects/dark-blue-glow-beam.avif"
                alt=""
                width={2350}
                height={2350}
                className="pointer-events-none absolute -top-[20rem] -left-[30rem] z-100 hidden select-none mix-blend-overlay md:block"
                aria-hidden="true"
            />
            <Image
                src="/assets/effects/dark-blue-glow-beam.avif"
                alt=""
                width={2350}
                height={2350}
                className="pointer-events-none absolute -top-[35rem] -right-[30rem] z-100 hidden select-none mix-blend-overlay md:block"
                aria-hidden="true"
            />
            <div className="container relative mx-auto w-full">
                <DottedLines left right color="gray-900" />
                <div className="mx-auto max-w-2xl md:rounded-lg md:shadow-contact">
                    <div className="relative isolate border-ds-control-border bg-ds-canvas p-8 md:rounded-lg md:border md:bg-ds-surface">
                        <DottedLines top bottom left right color="gray-900" />
                        <div className="absolute -inset-x-20 bottom-[calc(-93/16*1rem)] -z-10 h-[calc(440/16*1rem)] bg-gradient-to-t from-55% from-ds-canvas to-95%" />
                        {isSuccess ? (
                            <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
                                <div className="mb-6">
                                    <svg
                                        width="60"
                                        height="60"
                                        viewBox="0 0 56 56"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        aria-hidden="true"
                                    >
                                        <g transform="rotate(-10, 28, 28)">
                                            <path
                                                d="M28 6C29.1 6 30.2 6.3 31.1 6.8L44.9 14.8C46.7 15.8 47.8 17.8 47.8 19.9V36.1C47.8 38.2 46.7 40.2 44.9 41.2L31.1 49.2C29.3 50.2 26.7 50.2 24.9 49.2L11.1 41.2C9.3 40.2 8.2 38.2 8.2 36.1V19.9C8.2 17.8 9.3 15.8 11.1 14.8L24.9 6.8C25.8 6.3 26.9 6 28 6Z"
                                                className="fill-ds-blue-700"
                                            />
                                        </g>
                                        <path
                                            d="M22 28.5L25.5 32L34 23.5"
                                            stroke="white"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                                <h2 className="mb-3 font-semibold text-2xl text-ds-fg">
                                    {t("contact.success.title", {
                                        defaultValue: "Thank you!",
                                    })}
                                </h2>
                                <p className="mb-4 text-ds-fg-muted text-lg">
                                    {t("contact.success.description", {
                                        defaultValue: "We'll get back to you as soon as possible.",
                                    })}
                                </p>
                                <Link
                                    to="/$lang/pricing"
                                    params={{ lang }}
                                    className="font-medium text-base text-ds-blue-700 hover:underline"
                                >
                                    {t("contact.success.link", {
                                        defaultValue: "View our pricing plans",
                                    })}
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="relative z-10 mx-auto mb-12 flex max-w-lg flex-col gap-8">
                                    <div>
                                        <h1 className="mb-2 pt-8 font-semibold text-ds-fg text-xl lg:text-2xl">
                                            {t("contact.title")}
                                        </h1>
                                        <p className="mb-6 text-base text-ds-fg-muted">
                                            {t("contact.subtitle")}
                                        </p>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0">
                                                    <Check
                                                        className="size-3.5 text-ds-fg"
                                                        strokeWidth={2}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-base text-ds-fg">
                                                        <strong className="font-medium text-xs">
                                                            {t("contact.features.demo")}
                                                        </strong>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0">
                                                    <Check
                                                        className="size-3.5 text-ds-fg"
                                                        strokeWidth={2}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-base text-ds-fg">
                                                        <strong className="font-medium text-xs">
                                                            {t("contact.features.trial")}
                                                        </strong>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0">
                                                    <Check
                                                        className="size-3.5 text-ds-fg"
                                                        strokeWidth={2}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-base text-ds-fg">
                                                        <strong className="font-medium text-xs">
                                                            {t("contact.features.onboarding")}
                                                        </strong>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Form
                                    of={form}
                                    className="relative z-10 mx-auto flex max-w-lg flex-col gap-8"
                                    onSubmit={onSubmit}
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormischField of={form} path={["email"]}>
                                            {(field) => (
                                                <Field data-invalid={field.errors !== null}>
                                                    <FieldLabel htmlFor={emailId} className="mb-2">
                                                        {t("contact.form.workEmail")}
                                                    </FieldLabel>
                                                    <Input
                                                        {...field.props}
                                                        type="email"
                                                        id={emailId}
                                                        value={field.input ?? ""}
                                                        placeholder={t(
                                                            "contact.form.workEmailPlaceholder"
                                                        )}
                                                        aria-invalid={field.errors !== null}
                                                        autoFocus={!session}
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

                                        <FormischField of={form} path={["fullName"]}>
                                            {(field) => (
                                                <Field data-invalid={field.errors !== null}>
                                                    <FieldLabel
                                                        htmlFor={fullNameId}
                                                        className="mb-2"
                                                    >
                                                        {t("contact.form.fullName")}
                                                    </FieldLabel>
                                                    <Input
                                                        {...field.props}
                                                        type="text"
                                                        id={fullNameId}
                                                        value={field.input ?? ""}
                                                        placeholder={t(
                                                            "contact.form.fullNamePlaceholder"
                                                        )}
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

                                    <FormischField of={form} path={["country"]}>
                                        {(field) => (
                                            <Field data-invalid={field.errors !== null}>
                                                <FieldLabel htmlFor={countryId} className="mb-2">
                                                    {t("contact.form.country")}
                                                </FieldLabel>
                                                <CountrySelect
                                                    id={countryId}
                                                    value={countryValue}
                                                    onChange={(value) => field.onChange(value)}
                                                    placeholder={t("contact.form.selectCountry")}
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormischField of={form} path={["website"]}>
                                            {(field) => (
                                                <Field data-invalid={field.errors !== null}>
                                                    <FieldLabel
                                                        htmlFor={websiteId}
                                                        className="mb-2"
                                                    >
                                                        {t("contact.form.companyWebsite")}
                                                    </FieldLabel>
                                                    <Input
                                                        {...field.props}
                                                        type="url"
                                                        id={websiteId}
                                                        value={field.input ?? ""}
                                                        placeholder={t(
                                                            "contact.form.companyWebsitePlaceholder"
                                                        )}
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

                                        <FormischField of={form} path={["companySize"]}>
                                            {(field) => (
                                                <Field>
                                                    <FieldLabel
                                                        htmlFor={companySizeId}
                                                        className="mb-2"
                                                    >
                                                        {t("contact.form.companySize")}
                                                    </FieldLabel>
                                                    <NativeSelect
                                                        {...field.props}
                                                        id={companySizeId}
                                                        value={field.input ?? ""}
                                                    >
                                                        <option value="">
                                                            {t("contact.form.selectValue")}
                                                        </option>
                                                        <option value="1-10">1-10</option>
                                                        <option value="11-50">11-50</option>
                                                        <option value="51-200">51-200</option>
                                                        <option value="201-500">201-500</option>
                                                        <option value="501+">
                                                            501+ {t("contact.form.employees")}
                                                        </option>
                                                    </NativeSelect>
                                                </Field>
                                            )}
                                        </FormischField>
                                    </div>

                                    <FormischField of={form} path={["message"]}>
                                        {(field) => (
                                            <Field data-invalid={field.errors !== null}>
                                                <FieldLabel htmlFor={messageId} className="mb-2">
                                                    {t("contact.form.message")}
                                                </FieldLabel>
                                                <Textarea
                                                    {...field.props}
                                                    id={messageId}
                                                    rows={4}
                                                    value={field.input ?? ""}
                                                    placeholder={t(
                                                        "contact.form.messagePlaceholder"
                                                    )}
                                                    className="max-h-60"
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

                                    <Button
                                        type="submit"
                                        radius="full"
                                        size="xl"
                                        disabled={form.isSubmitting}
                                    >
                                        {form.isSubmitting ? (
                                            <Spinner className="size-5" />
                                        ) : (
                                            t("contact.form.submit")
                                        )}
                                    </Button>
                                </Form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function isDemoSearchRequest(): boolean {
    if (typeof window === "undefined") return false
    return new URLSearchParams(window.location.search).get("demo") === "true"
}
