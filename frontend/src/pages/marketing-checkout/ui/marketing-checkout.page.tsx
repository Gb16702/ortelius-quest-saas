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
import { ArrowLeft } from "lucide-react"
import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import * as v from "valibot"
import {
    normalizeOrganizationSlugInput,
    ORGANIZATION_SLUG_MAX_LENGTH,
    ORGANIZATION_SLUG_MIN_LENGTH,
    organizationSlugSchema,
    slugifyOrganizationName,
} from "@/entities/organization"
import type { Plan } from "@/entities/subscription"
import {
    type CheckoutBillingPeriod,
    type CheckoutPlanSearchIssue,
    checkOrganizationSlug,
    ORG_NAME_MAX_LENGTH,
    ORG_NAME_MIN_LENGTH,
    PlanSummaryCard,
    resolveCheckoutSearchParams,
    StepHeader,
    saveCheckoutData,
    startFreeTrial,
} from "@/features/marketing"
import { Button } from "@/shared/ui/button"
import { CharacterCounter } from "@/shared/ui/character-counter"
import { FieldError } from "@/shared/ui/field"
import { FormGroup } from "@/shared/ui/form-group"
import { Input } from "@/shared/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group"
import { Spinner } from "@/shared/ui/spinner"

interface MarketingCheckoutPageProps {
    language?: string
    onNavigate?: (href: string) => void
    plans: Plan[]
    searchParams?: URLSearchParams
}

function getInitialLanguage(language?: string): string {
    if (language) return language
    if (typeof window === "undefined") return "en"

    const [, firstSegment] = window.location.pathname.split("/")
    return firstSegment || "en"
}

function getInitialSearchParams(searchParams?: URLSearchParams): URLSearchParams {
    if (searchParams) return searchParams
    if (typeof window === "undefined") return new URLSearchParams()

    return new URLSearchParams(window.location.search)
}

function defaultNavigate(href: string): void {
    if (typeof window === "undefined") return
    window.location.assign(href)
}

function getWorkspaceUrlPrefix(): string {
    if (typeof window === "undefined") return "/org/"
    return `${window.location.host}/org/`
}

export function MarketingCheckoutPage({
    language: languageProp,
    onNavigate = defaultNavigate,
    plans,
    searchParams: searchParamsProp,
}: MarketingCheckoutPageProps) {
    const { t } = useTranslation()
    const language = getInitialLanguage(languageProp)
    const searchParams = getInitialSearchParams(searchParamsProp)
    const { billing, selectedPlan, planIssue } = resolveCheckoutSearchParams(searchParams, plans)

    return (
        <div className="relative flex flex-1 flex-col">
            <header className="relative z-10 w-fit px-6 py-4">
                <div>
                    <Link className="max-w-fit" to="/$lang/home" params={{ lang: language }}>
                        <Image
                            src="/assets/logo.svg"
                            alt={t("home.hero.heroImageAlt")}
                            layout="constrained"
                            width={36}
                            height={36}
                            className="h-auto rounded-sm"
                        />
                    </Link>
                </div>
            </header>

            {selectedPlan ? (
                <MarketingCheckoutForm
                    billing={billing}
                    lang={language}
                    onNavigate={onNavigate}
                    selectedPlan={selectedPlan}
                />
            ) : (
                <InvalidCheckoutLink lang={language} planIssue={planIssue ?? "invalid"} />
            )}
        </div>
    )
}

interface MarketingCheckoutFormProps {
    billing: CheckoutBillingPeriod
    lang: string
    onNavigate: (href: string) => void
    selectedPlan: Plan
}

function MarketingCheckoutForm({
    billing,
    lang,
    onNavigate,
    selectedPlan,
}: MarketingCheckoutFormProps) {
    const organizationNameId = useId()
    const organizationSlugId = useId()
    const { t } = useTranslation()
    const [serverError, setServerError] = useState<string | null>(null)
    const [orgNameFocused, setOrgNameFocused] = useState(true)
    const [organizationSlugEdited, setOrganizationSlugEdited] = useState(false)

    const checkoutSchema = v.object({
        organizationName: v.pipe(
            v.string(),
            v.minLength(
                1,
                t("checkout.validation.organizationNameRequired", {
                    defaultValue: "Organization name is required",
                })
            ),
            v.minLength(
                ORG_NAME_MIN_LENGTH,
                t("checkout.validation.organizationNameMin", {
                    defaultValue: `Name must be at least ${ORG_NAME_MIN_LENGTH} characters`,
                })
            ),
            v.maxLength(
                ORG_NAME_MAX_LENGTH,
                t("checkout.validation.organizationNameMax", {
                    defaultValue: `Name must be at most ${ORG_NAME_MAX_LENGTH} characters`,
                })
            )
        ),
        organizationSlug: v.pipe(
            v.string(),
            v.minLength(
                1,
                t("checkout.validation.organizationSlugRequired", {
                    defaultValue: "Workspace URL is required",
                })
            ),
            v.minLength(
                ORGANIZATION_SLUG_MIN_LENGTH,
                t("checkout.validation.organizationSlugMin", {
                    defaultValue: `URL must be at least ${ORGANIZATION_SLUG_MIN_LENGTH} characters`,
                })
            ),
            v.maxLength(
                ORGANIZATION_SLUG_MAX_LENGTH,
                t("checkout.validation.organizationSlugMax", {
                    defaultValue: `URL must be at most ${ORGANIZATION_SLUG_MAX_LENGTH} characters`,
                })
            ),
            v.check(
                (value) => v.safeParse(organizationSlugSchema, value).success,
                t("checkout.validation.organizationSlugFormat", {
                    defaultValue: "Use lowercase letters, numbers, and hyphens only",
                })
            )
        ),
    })

    const form = useForm({
        schema: checkoutSchema,
        initialInput: {
            organizationName: "",
            organizationSlug: "",
        },
        validate: "submit",
    })

    const organizationNameValue = getInput(form, { path: ["organizationName"] }) ?? ""

    const onSubmit: SubmitEventHandler<typeof checkoutSchema> = async (data) => {
        setServerError(null)

        try {
            const checkResult = await checkOrganizationSlug(data.organizationSlug)

            if (!checkResult.available) {
                setServerError(
                    t(`checkout.errors.${checkResult.errorCode}`, {
                        defaultValue: t("checkout.errors.INVALID_FORMAT"),
                    })
                )
                return
            }

            const response = await startFreeTrial(
                data.organizationName,
                data.organizationSlug,
                selectedPlan.name
            )

            saveCheckoutData({
                organizationName: data.organizationName,
                organizationSlug: data.organizationSlug,
                plan: selectedPlan.name,
                checkoutId: response.checkoutId,
                isTrial: true,
                trialRedirectUrl: response.redirectUrl,
            })

            const successParams = new URLSearchParams({ redirect_status: "succeeded" })
            if (response.checkoutId) {
                successParams.set("checkout_id", response.checkoutId)
            } else {
                successParams.set("redirect_url", response.redirectUrl)
            }

            onNavigate(`/${lang}/checkout-success?${successParams.toString()}`)
        } catch (err) {
            console.error("Checkout error:", err)
            setServerError(
                t("checkout.errors.generic", {
                    defaultValue: "Something went wrong. Please try again.",
                })
            )
        }
    }

    const handleBack = () => {
        const billingQuery = billing === "monthly" ? "?billing=monthly" : ""
        onNavigate(`/${lang}/pricing${billingQuery}`)
    }

    return (
        <div className="relative flex flex-1 items-start justify-center px-4 py-8">
            <div className="relative mx-auto w-full max-w-5xl px-0 sm:px-4">
                <div className="relative grid md:grid-cols-[1fr_440px]">
                    <PlanSummaryCard
                        plan={selectedPlan}
                        lang={lang}
                        billing={billing}
                        canUseTrial={true}
                    />
                    <div className="md:order-1">
                        <div className="mx-auto md:mx-0 md:max-w-md">
                            <div className="px-1 text-left">
                                <StepHeader
                                    step={1}
                                    titleKey="checkout.step1Title"
                                    titleDefault="Name your organization"
                                    subtitleKey="checkout.step1Subtitle"
                                    subtitleDefault="This will be your workspace name and subdomain"
                                    onBack={handleBack}
                                    hideStepIndicator
                                />

                                <Form of={form} onSubmit={onSubmit} className="text-left">
                                    <FormischField of={form} path={["organizationName"]}>
                                        {(field) => (
                                            <FormGroup data-invalid={!!field.errors?.length}>
                                                <div className="relative">
                                                    <Input
                                                        {...field.props}
                                                        size="sm"
                                                        autoFocus
                                                        id={organizationNameId}
                                                        type="text"
                                                        value={field.input ?? ""}
                                                        onChange={(event) => {
                                                            const nextName = event.target.value
                                                            field.onChange(nextName)
                                                            if (!organizationSlugEdited) {
                                                                setInput(form, {
                                                                    path: ["organizationSlug"],
                                                                    input: slugifyOrganizationName(
                                                                        nextName
                                                                    ),
                                                                })
                                                            }
                                                            if (serverError) setServerError(null)
                                                        }}
                                                        onFocus={() => setOrgNameFocused(true)}
                                                        onBlur={(event) => {
                                                            field.props.onBlur(event)
                                                            setOrgNameFocused(false)
                                                        }}
                                                        placeholder={t(
                                                            "checkout.organizationNamePlaceholder",
                                                            {
                                                                defaultValue: "Acme Inc",
                                                            }
                                                        )}
                                                        aria-label={t("checkout.organizationName", {
                                                            defaultValue: "Organization name",
                                                        })}
                                                        maxLength={ORG_NAME_MAX_LENGTH}
                                                        className="pr-10 shadow-none"
                                                        aria-invalid={!!field.errors?.length}
                                                    />
                                                    {orgNameFocused && (
                                                        <CharacterCounter
                                                            current={organizationNameValue.length}
                                                            max={ORG_NAME_MAX_LENGTH}
                                                        />
                                                    )}
                                                </div>
                                                {field.errors && (
                                                    <FieldError
                                                        errors={field.errors.map((message) => ({
                                                            message,
                                                        }))}
                                                    />
                                                )}
                                            </FormGroup>
                                        )}
                                    </FormischField>

                                    <FormischField of={form} path={["organizationSlug"]}>
                                        {(field) => (
                                            <FormGroup
                                                className="mt-4"
                                                data-invalid={
                                                    !!(field.errors?.length || serverError)
                                                }
                                            >
                                                <InputGroup size="sm">
                                                    <InputGroupAddon
                                                        align="inline-start"
                                                        className="text-ds-fg-muted"
                                                    >
                                                        <span>{getWorkspaceUrlPrefix()}</span>
                                                    </InputGroupAddon>
                                                    <InputGroupInput
                                                        {...field.props}
                                                        id={organizationSlugId}
                                                        type="text"
                                                        value={field.input ?? ""}
                                                        onChange={(event) => {
                                                            setOrganizationSlugEdited(true)
                                                            field.onChange(
                                                                normalizeOrganizationSlugInput(
                                                                    event.target.value
                                                                )
                                                            )
                                                            if (serverError) setServerError(null)
                                                        }}
                                                        placeholder={t(
                                                            "checkout.organizationSlugPlaceholder",
                                                            {
                                                                defaultValue: "acme-inc",
                                                            }
                                                        )}
                                                        aria-label={t("checkout.organizationSlug", {
                                                            defaultValue: "Workspace URL",
                                                        })}
                                                        maxLength={ORGANIZATION_SLUG_MAX_LENGTH}
                                                        aria-invalid={
                                                            !!(field.errors?.length || serverError)
                                                        }
                                                    />
                                                </InputGroup>
                                                {field.errors ? (
                                                    <FieldError
                                                        errors={field.errors.map((message) => ({
                                                            message,
                                                        }))}
                                                    />
                                                ) : (
                                                    serverError && (
                                                        <FieldError>{serverError}</FieldError>
                                                    )
                                                )}
                                            </FormGroup>
                                        )}
                                    </FormischField>

                                    <Button
                                        type="submit"
                                        className="mt-6 w-full"
                                        size="xl"
                                        radius="full"
                                        disabled={form.isSubmitting}
                                    >
                                        {form.isSubmitting ? (
                                            <Spinner className="size-5" />
                                        ) : (
                                            t("checkout.startTrial", {
                                                defaultValue: "Start free trial",
                                            })
                                        )}
                                    </Button>
                                </Form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface InvalidCheckoutLinkProps {
    lang: string
    planIssue: CheckoutPlanSearchIssue
}

function InvalidCheckoutLink({ lang, planIssue }: InvalidCheckoutLinkProps) {
    const { t } = useTranslation()
    const title =
        planIssue === "missing"
            ? t("checkout.invalidLink.missingPlanTitle", {
                  defaultValue: "Choose a plan to continue",
              })
            : t("checkout.invalidLink.invalidPlanTitle", {
                  defaultValue: "This checkout link is invalid",
              })
    const description =
        planIssue === "missing"
            ? t("checkout.invalidLink.missingPlanDescription", {
                  defaultValue: "Start from pricing so checkout can use the plan you choose.",
              })
            : t("checkout.invalidLink.invalidPlanDescription", {
                  defaultValue:
                      "The selected plan is not available. Return to pricing and choose a current plan.",
              })

    return (
        <div className="relative flex flex-1 items-start justify-center px-4 py-16">
            <div className="w-full max-w-md rounded-lg border border-ds-surface-border bg-ds-surface p-8 text-center">
                <h1 className="font-semibold text-2xl text-ds-fg">{title}</h1>
                <p className="mt-3 text-ds-fg-muted text-sm leading-6">{description}</p>
                <Button asChild className="mt-8" radius="full" size="xl">
                    <Link to="/$lang/pricing" params={{ lang }}>
                        <ArrowLeft aria-hidden="true" className="size-4" />
                        {t("checkout.invalidLink.cta", { defaultValue: "Back to pricing" })}
                    </Link>
                </Button>
            </div>
        </div>
    )
}
