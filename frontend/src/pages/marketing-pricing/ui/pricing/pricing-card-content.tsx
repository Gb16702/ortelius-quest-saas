import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import type { FeatureKey, MarketingCurrentSubscription, Plan } from "@/entities/subscription"
import { FEATURE_ICON_NAMES, PLAN_HIGHLIGHTS, YEARLY_DISCOUNT } from "@/entities/subscription"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing"
import { Button } from "@/shared/ui/button"
import { NamedIcon } from "@/shared/ui/icons/named-icon"
import { Switch } from "@/shared/ui/switch"
import type { PricingBillingPeriod } from "../../model/pricing-billing-period.schema"
import { planHasFeature } from "./plan-has-feature"

interface PricingCardContentProps {
    plan: Plan
    isHighlighted: boolean
    billingPeriod: PricingBillingPeriod
    onBillingChange: (period: PricingBillingPeriod) => void
    subscriptionStatus: MarketingCurrentSubscription
    activeOrgSlug: string | null
    lang: SupportedLanguage
}

export function PricingCardContent({
    plan,
    isHighlighted,
    billingPeriod,
    onBillingChange,
    subscriptionStatus,
    activeOrgSlug,
    lang,
}: PricingCardContentProps) {
    const { t } = useTranslation()
    const planName = plan.name.toLowerCase()
    const highlightFeatures = getHighlightFeatures(plan)
    const previousTierLabel =
        planName === "professional"
            ? t("pricing.everythingInStarterPlus", {
                  defaultValue: "Everything in Starter plus",
              })
            : planName === "enterprise"
              ? t("pricing.everythingInProfessionalPlus", {
                    defaultValue: "Everything in Professional plus",
                })
              : null

    const isCurrentPlan =
        subscriptionStatus.hasActiveSubscription &&
        subscriptionStatus.plan?.toLowerCase() === plan.name.toLowerCase()

    return (
        <>
            <div>
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-ds-fg text-xl">
                        {t(`pricing.plans.${plan.name.toLowerCase()}`, {
                            defaultValue: plan.name,
                        })}
                    </h3>
                    {isHighlighted && (
                        <span className="rounded-full bg-ds-blue-700 px-2 py-1.25 font-medium text-[12px] text-white">
                            {t("pricing.recommended", { defaultValue: "Recommended" })}
                        </span>
                    )}
                </div>
                <div className="mt-3">
                    <div className="flex items-end gap-2">
                        <div className="flex items-start">
                            <span className="font-semibold text-4xl text-ds-fg leading-none">
                                {getDisplayPrice(plan.prices.monthly.amount, billingPeriod)}€
                            </span>
                        </div>
                        <span className="text-ds-fg-subtle text-sm">
                            {t("pricing.perUserMonth", {
                                defaultValue: "per user / month",
                            })}
                        </span>
                    </div>
                </div>
            </div>

            <div className="-mx-6 mt-5 flex items-center gap-x-3 border-ds-surface-border border-y px-6 py-5">
                <Switch
                    size="default"
                    checked={billingPeriod === "yearly"}
                    onCheckedChange={(checked) => onBillingChange(checked ? "yearly" : "monthly")}
                />
                <span className="text-ds-fg text-sm">
                    {billingPeriod === "yearly"
                        ? t("pricing.billedYearly", { defaultValue: "Billed yearly" })
                        : t("pricing.billedMonthly", { defaultValue: "Billed monthly" })}
                    {billingPeriod === "yearly" && (
                        <span className="text-ds-blue-700">
                            {" "}
                            {t("pricing.savePerUser", {
                                defaultValue: "(save {{amount}}€ per user)",
                                amount: getSavingsPerMonth(plan.prices.monthly.amount) * 12,
                            })}
                        </span>
                    )}
                </span>
            </div>

            <div className="flex-1 py-6">
                <ul className="space-y-4">
                    {previousTierLabel && (
                        <li className="text-ds-fg text-sm">{previousTierLabel}</li>
                    )}
                    {highlightFeatures.map((key) => {
                        const iconName = FEATURE_ICON_NAMES[key]
                        return (
                            <li key={key} className="flex items-start gap-3">
                                <NamedIcon
                                    name={iconName}
                                    className="mt-0.5 size-4 shrink-0 text-ds-blue-700"
                                />
                                <span className="text-ds-fg text-sm">
                                    {t(`checkout.features.${key}`, { defaultValue: key })}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            </div>

            <div className="mt-auto">
                {isCurrentPlan && activeOrgSlug ? (
                    <Button size="xl" variant="brand" radius="full" className="w-full" asChild>
                        <Link to="/org/$slug/settings/billing" params={{ slug: activeOrgSlug }}>
                            {t("pricing.manageSubscription", {
                                defaultValue: "Manage subscription",
                            })}
                        </Link>
                    </Button>
                ) : subscriptionStatus.hasActiveSubscription ? null : (
                    <Button
                        size="xl"
                        variant={isHighlighted ? "brand" : "outline"}
                        radius="full"
                        className="w-full"
                        asChild
                    >
                        {activeOrgSlug ? (
                            <Link
                                to="/org/$slug/settings/billing"
                                params={{ slug: activeOrgSlug }}
                                search={{ plan: planName, billing: billingPeriod }}
                            >
                                {t("nav.tryForFree", { defaultValue: "Try for free" })}
                            </Link>
                        ) : (
                            <Link
                                to="/$lang/checkout"
                                params={{ lang }}
                                search={{ plan: planName, billing: billingPeriod }}
                            >
                                {t("nav.tryForFree", { defaultValue: "Try for free" })}
                            </Link>
                        )}
                    </Button>
                )}
            </div>
        </>
    )
}

function getDisplayPrice(monthlyPrice: number, billingPeriod: PricingBillingPeriod): number {
    if (billingPeriod === "yearly") {
        return Math.floor(monthlyPrice * (1 - YEARLY_DISCOUNT))
    }
    return Math.floor(monthlyPrice)
}

function getSavingsPerMonth(monthlyPrice: number): number {
    return Math.floor(monthlyPrice * YEARLY_DISCOUNT)
}

function getHighlightFeatures(plan: Plan): FeatureKey[] {
    const highlights = PLAN_HIGHLIGHTS[plan.name]
    return highlights.filter((key) => planHasFeature(plan, key))
}
