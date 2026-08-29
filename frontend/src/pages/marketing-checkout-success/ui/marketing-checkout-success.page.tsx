import { Link } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    type CheckoutSuccessRequest,
    type CheckoutSuccessSearch,
    checkoutSuccessSearchSchema,
    clearCheckoutData,
    completeCheckout,
    completeCheckoutById,
    createCheckoutSuccessSearchParams,
    getStoredCheckoutData,
    resolveCheckoutSuccessRequest,
} from "@/features/marketing"
import { ApiError } from "@/shared/api/http.response"
import { getSafeSameOriginRedirect } from "@/shared/lib/validation/url.schema"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { Button } from "@/shared/ui/button"

const PHRASE_DURATION = 2000

const LOADING_PHRASES = [
    "Setting up your workspace",
    "Configuring your organization",
    "Almost there",
]

interface MarketingCheckoutSuccessPageProps {
    language?: string
    requestOrigin?: string | null
    search?: CheckoutSuccessSearch
}

type CheckoutCompletionStatus = "loading" | "error" | "no-data" | "unauthorized" | "payment-failed"

interface CompletionFailure {
    status: CheckoutCompletionStatus
    error: string | null
}

type CheckoutSuccessFailureResolution = Exclude<
    ReturnType<typeof resolveCheckoutSuccessRequest>,
    { status: "ready" }
>

function getResolutionFailure(resolution: CheckoutSuccessFailureResolution): CompletionFailure {
    if (resolution.status === "payment-failed") {
        return { status: "payment-failed", error: "Payment was not successful" }
    }

    if (resolution.status === "invalid-identifier") {
        return { status: "error", error: "Checkout link is invalid" }
    }

    return { status: "no-data", error: null }
}

async function completeCheckoutRequest(request: CheckoutSuccessRequest): Promise<string> {
    if (request.kind === "server-redirect") return request.redirectUrl

    const response =
        request.kind === "server-intent"
            ? await completeCheckoutById(request.checkoutId)
            : await completeCheckout(
                  request.stripeSubscriptionId,
                  request.organizationName,
                  request.organizationSlug
              )

    return response.redirectUrl
}

function getCompletionErrorStatus(err: unknown): CheckoutCompletionStatus {
    return err instanceof ApiError && err.status === 401 ? "unauthorized" : "error"
}

function getInitialLanguage(language?: string): string {
    if (language) return language
    if (typeof window === "undefined") return "en"

    const [, firstSegment] = window.location.pathname.split("/")
    return firstSegment || "en"
}

function getInitialRequestOrigin(requestOrigin?: string | null): string | null {
    if (requestOrigin) return requestOrigin
    if (typeof window === "undefined") return null

    return window.location.origin
}

function getCurrentHref(): string {
    if (typeof window === "undefined") return "/checkout-success"

    return window.location.href
}

function getInitialSearch(search?: CheckoutSuccessSearch): CheckoutSuccessSearch {
    if (search) return search
    if (typeof window === "undefined") return {}

    return parseSchema(
        checkoutSuccessSearchSchema,
        Object.fromEntries(new URLSearchParams(window.location.search))
    )
}

export function MarketingCheckoutSuccessPage({
    language: languageProp,
    requestOrigin: requestOriginProp,
    search: searchProp,
}: MarketingCheckoutSuccessPageProps) {
    const { t } = useTranslation()
    const language = getInitialLanguage(languageProp)
    const requestOrigin = getInitialRequestOrigin(requestOriginProp)
    const search = getInitialSearch(searchProp)
    const searchParams = createCheckoutSuccessSearchParams(search)

    const [status, setStatus] = useState<CheckoutCompletionStatus>("loading")
    const [error, setError] = useState<string | null>(null)
    const [phraseIndex, setPhraseIndex] = useState(0)

    const apiCompleted = useRef(false)
    const completionStarted = useRef(false)
    const redirectUrl = useRef<string | null>(null)
    const cycleCompleted = useRef(false)

    const navigateToSafeRedirect = useCallback(
        (value: string | null) => {
            if (!requestOrigin) {
                setStatus("error")
                setError("Checkout redirect origin is unavailable")
                return
            }

            const safeRedirect = getSafeSameOriginRedirect(value, requestOrigin)
            if (!safeRedirect) {
                setStatus("error")
                setError("Checkout redirect is invalid")
                return
            }
            clearCheckoutData()
            window.location.href = safeRedirect
        },
        [requestOrigin]
    )

    const completeWithRedirect = useCallback(
        (value: string) => {
            apiCompleted.current = true
            redirectUrl.current = value

            if (cycleCompleted.current) {
                navigateToSafeRedirect(value)
            }
        },
        [navigateToSafeRedirect]
    )

    useEffect(() => {
        if (status !== "loading") return

        const interval = setInterval(() => {
            setPhraseIndex((prev) => {
                const nextIndex = prev + 1

                if (nextIndex >= LOADING_PHRASES.length) {
                    cycleCompleted.current = true

                    if (apiCompleted.current && redirectUrl.current) {
                        navigateToSafeRedirect(redirectUrl.current)
                        return prev
                    }

                    return LOADING_PHRASES.length - 1
                }

                return nextIndex
            })
        }, PHRASE_DURATION)

        return () => clearInterval(interval)
    }, [status, navigateToSafeRedirect])

    useEffect(() => {
        const completeSubscription = async () => {
            if (completionStarted.current) return
            completionStarted.current = true

            const resolution = resolveCheckoutSuccessRequest(searchParams, getStoredCheckoutData())
            if (resolution.status !== "ready") {
                const failure = getResolutionFailure(resolution)
                setStatus(failure.status)
                setError(failure.error)
                return
            }

            try {
                completeWithRedirect(await completeCheckoutRequest(resolution.request))
            } catch (err) {
                console.error("[checkout.success] Error:", err)
                setStatus(getCompletionErrorStatus(err))
                setError(err instanceof Error ? err.message : "Failed to complete checkout")
            }
        }

        completeSubscription()
    }, [completeWithRedirect, searchParams])

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-ds-surface">
                <div className="text-center">
                    <h1 className="mb-2 font-semibold text-2xl text-ds-fg">
                        {t("checkout.processing.title", {
                            defaultValue: "Getting your plan ready",
                        })}
                    </h1>
                    <div className="relative h-6 overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={phraseIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="text-ds-fg-subtle"
                            >
                                {t(`checkout.processing.phrase${phraseIndex + 1}`, {
                                    defaultValue: LOADING_PHRASES[phraseIndex],
                                })}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        )
    }

    if (status === "no-data") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-ds-surface">
                <div className="max-w-md px-4 text-center">
                    <h1 className="mb-2 font-semibold text-2xl text-ds-fg">
                        {t("checkout.expired.title", { defaultValue: "Session expired" })}
                    </h1>
                    <p className="mb-6 text-ds-fg-subtle">
                        {t("checkout.expired.subtitle", {
                            defaultValue: "Your checkout session has expired. Please start over.",
                        })}
                    </p>
                    <Button asChild radius="full">
                        <Link to="/$lang/pricing" params={{ lang: language }}>
                            {t("checkout.expired.cta", { defaultValue: "Back to pricing" })}
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    if (status === "unauthorized") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-ds-surface">
                <div className="max-w-md px-4 text-center">
                    <h1 className="mb-2 font-semibold text-2xl text-ds-fg">
                        {t("checkout.auth.title", { defaultValue: "One more step!" })}
                    </h1>
                    <p className="mb-2 text-ds-fg-subtle">
                        {t("checkout.auth.subtitle", {
                            defaultValue: "Sign in to complete your subscription.",
                        })}
                    </p>
                    <p className="mb-6 text-ds-fg-subtle text-sm">
                        {t("checkout.auth.paymentSuccess", {
                            defaultValue:
                                "Your payment was successful. Sign in to access your organization.",
                        })}
                    </p>
                    <Button asChild radius="full">
                        <Link to="/sign-in" search={{ redirect: getCurrentHref() }} preload={false}>
                            {t("checkout.auth.cta", { defaultValue: "Sign in" })}
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    if (status === "error" || status === "payment-failed") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-ds-surface">
                <div className="max-w-md px-4 text-center">
                    <h1 className="mb-2 font-semibold text-2xl text-ds-fg">
                        {t("checkout.error.title", {
                            defaultValue: "Something went wrong",
                        })}
                    </h1>
                    <p className="mb-2 text-ds-fg-subtle">{error}</p>
                    <p className="mb-6 text-ds-fg-subtle text-sm">
                        {t("checkout.error.support", {
                            defaultValue: "If you were charged, please contact support.",
                        })}
                    </p>
                    <div className="flex justify-center gap-3">
                        <Button asChild variant="outline" radius="full">
                            <Link to="/$lang/home" params={{ lang: language }}>
                                {t("checkout.error.backHome", { defaultValue: "Back to home" })}
                            </Link>
                        </Button>
                        <Button asChild radius="full">
                            <Link to="/$lang/pricing" params={{ lang: language }}>
                                {t("checkout.error.tryAgain", { defaultValue: "Try again" })}
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
