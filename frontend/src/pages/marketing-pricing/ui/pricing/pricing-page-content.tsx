import { useTranslation } from "react-i18next"
import type { MarketingCurrentSubscription, Plan } from "@/entities/subscription"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing"
import { CtaSection, FaqSection } from "@/widgets/marketing-sections"
import { FeatureComparison } from "./feature-comparison"
import { PricingCards } from "./pricing-cards"
import { usePricingBillingPeriod } from "./use-pricing-billing-period"

const HIGHLIGHTED_PLAN = "professional"

interface PricingPageContentProps {
    plans: Plan[]
    lang: SupportedLanguage
    subscriptionStatus: MarketingCurrentSubscription
    activeOrgSlug: string | null
}

export function PricingPageContent({
    plans,
    lang,
    subscriptionStatus,
    activeOrgSlug,
}: PricingPageContentProps) {
    const { t } = useTranslation()
    const { billingPeriod, setBillingPeriod } = usePricingBillingPeriod()

    const getSubtitle = () => {
        if (subscriptionStatus.hasActiveSubscription) {
            return t("pricing.subtitle.currentPlan", {
                defaultValue: "You're currently on the {{plan}} plan.",
                plan: subscriptionStatus.plan,
            })
        }
        if (subscriptionStatus.hasUsedTrial) {
            return t("pricing.subtitle.choosePlan", {
                defaultValue: "Choose the plan that fits your team.",
            })
        }
        return t("pricing.subtitle.withTrial", {
            defaultValue:
                "All plans include a 14-day free trial. Pick the one that fits your team. Try for free, no credit card required.",
        })
    }

    return (
        <>
            <div className="min-h-screen bg-ds-surface pt-24 pb-12 sm:pb-20">
                <div className="container mx-auto">
                    <div className="mb-12 px-8 text-center">
                        <h1 className="font-bold text-4xl text-ds-fg lg:text-5xl">
                            {t("pricing.title", {
                                defaultValue: "Pricing that grows with you",
                            })}
                        </h1>
                        <p className="mx-auto mt-4 max-w-2xl text-ds-fg text-xl">{getSubtitle()}</p>
                    </div>

                    {plans.length > 0 ? (
                        <>
                            <PricingCards
                                activeOrgSlug={activeOrgSlug}
                                billingPeriod={billingPeriod}
                                highlightedPlan={HIGHLIGHTED_PLAN}
                                lang={lang}
                                onBillingChange={setBillingPeriod}
                                plans={plans}
                                subscriptionStatus={subscriptionStatus}
                            />

                            <h2 className="mt-24 mb-12 max-w-xs px-8 text-start font-bold text-3xl text-ds-fg sm:max-w-full sm:text-center sm:text-4xl">
                                {t("pricing.comparePlans", { defaultValue: "Compare plans" })}
                            </h2>

                            <FeatureComparison plans={plans} />
                        </>
                    ) : null}
                </div>
            </div>
            {!activeOrgSlug && (
                <div className="hidden sm:block">
                    <CtaSection lang={lang} />
                </div>
            )}
            <FaqSection />
        </>
    )
}
