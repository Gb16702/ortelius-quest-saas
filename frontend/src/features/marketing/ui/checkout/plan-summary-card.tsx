import { useTranslation } from "react-i18next"
import type { Plan } from "@/entities/subscription"
import { FEATURE_ICON_NAMES, PLAN_HIGHLIGHTS } from "@/entities/subscription"
import { NamedIcon } from "@/shared/ui/icons/named-icon"
import { TrialTimeline } from "./trial-timeline"

type BillingPeriod = "monthly" | "yearly"

interface PlanSummaryCardProps {
    plan: Plan
    lang: string
    billing: BillingPeriod
    canUseTrial: boolean
}

const YEARLY_DISCOUNT = 0.2

function formatPrice(amount: number, currency: string, lang: string) {
    return new Intl.NumberFormat(lang, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}

export function PlanSummaryCard({ plan, lang, billing, canUseTrial }: PlanSummaryCardProps) {
    const { t } = useTranslation()
    const trialDays = plan.freeTrial.days
    const highlightKeys = PLAN_HIGHLIGHTS[plan.name]
    const topFeatures = highlightKeys.filter((key) =>
        plan.features.some((f) => f.key === key && f.included)
    )

    const isYearly = billing === "yearly"
    const monthlyPrice = plan.prices.monthly.amount
    const displayPrice = isYearly ? monthlyPrice * (1 - YEARLY_DISCOUNT) : monthlyPrice

    return (
        <div className="hidden md:order-2 md:block">
            <div className="sticky top-8">
                <div className="overflow-hidden rounded-2xl border border-ds-control-border/75 bg-ds-surface shadow-pricing">
                    <div className="p-8 pb-5">
                        <h2 className="font-semibold text-2xl text-ds-fg">
                            {t(`pricing.plans.${plan.name.toLowerCase()}`, {
                                defaultValue: plan.name,
                            })}{" "}
                            {t("checkout.plan", { defaultValue: "plan" })}
                        </h2>
                    </div>

                    {topFeatures.length > 0 && (
                        <div className="border-ds-surface-border border-b px-8 pt-3 pb-6">
                            <p className="mb-4 text-ds-fg text-sm">
                                {t("checkout.topFeatures", { defaultValue: "Top features" })}
                            </p>
                            <ul className="space-y-3.5">
                                {topFeatures.map((featureKey) => {
                                    const iconName = FEATURE_ICON_NAMES[featureKey]
                                    return (
                                        <li key={featureKey} className="flex items-center gap-3">
                                            <NamedIcon
                                                name={iconName}
                                                className="size-4 shrink-0 text-ds-blue-700"
                                            />
                                            <span className="text-ds-fg text-sm">
                                                {t(`checkout.features.${featureKey}`, {
                                                    defaultValue: featureKey,
                                                })}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}

                    <div className="border-ds-surface-border border-b bg-ds-gray-50 px-8 py-5">
                        {canUseTrial ? (
                            <>
                                <p className="font-medium text-ds-fg text-sm">
                                    {t("checkout.billing.trialIncluded", {
                                        days: trialDays,
                                        defaultValue: `${trialDays}-day free trial`,
                                    })}
                                </p>
                                <p className="mt-1 text-ds-fg-subtle text-xs">
                                    {t("checkout.billing.noPaymentRequired", {
                                        defaultValue: "No payment required to start",
                                    })}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-ds-fg text-sm">
                                        {t("checkout.billing.dueToday", {
                                            defaultValue: "Due today",
                                        })}
                                    </span>
                                    <span className="font-semibold text-2xl text-ds-fg">
                                        {formatPrice(
                                            displayPrice,
                                            plan.prices.monthly.currency,
                                            lang
                                        )}
                                    </span>
                                </div>
                                <p className="mt-2 text-right text-ds-fg-subtle text-xs">
                                    {t("checkout.billing.perMonthPerUserNoTrial", {
                                        defaultValue: "per user / month",
                                    })}
                                </p>
                            </>
                        )}
                    </div>

                    {canUseTrial && (
                        <div className="px-8 py-6">
                            <TrialTimeline trialDays={trialDays} lang={lang} />
                        </div>
                    )}
                </div>

                <p className="mt-6 text-ds-fg-subtle text-xs leading-relaxed">
                    {canUseTrial
                        ? t("checkout.trialDisclaimer", {
                              defaultValue: "By starting your trial, you agree to the",
                          })
                        : t("checkout.billingDisclaimer", {
                              defaultValue:
                                  "By subscribing, you authorize The Space Behind BV to charge you according to the terms until you cancel. You also agree to the",
                          })}{" "}
                    <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-ds-fg-muted"
                    >
                        {t("checkout.termsOfService", { defaultValue: "Terms of Service" })}
                    </a>{" "}
                    {t("common.and", { defaultValue: "and" })}{" "}
                    <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-ds-fg-muted"
                    >
                        {t("checkout.privacyPolicy", { defaultValue: "Privacy Policy" })}
                    </a>
                    .
                </p>
            </div>
        </div>
    )
}
