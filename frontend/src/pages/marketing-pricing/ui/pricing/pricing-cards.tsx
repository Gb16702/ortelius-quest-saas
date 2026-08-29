import type { MarketingCurrentSubscription, Plan } from "@/entities/subscription"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing"
import type { PricingBillingPeriod } from "../../model/pricing-billing-period.schema"
import { PricingCardContent } from "./pricing-card-content"

interface PricingCardsProps {
    plans: Plan[]
    lang: SupportedLanguage
    highlightedPlan: string
    billingPeriod: PricingBillingPeriod
    onBillingChange: (period: PricingBillingPeriod) => void
    subscriptionStatus: MarketingCurrentSubscription
    activeOrgSlug: string | null
}

export function PricingCards({
    plans,
    lang,
    highlightedPlan,
    billingPeriod,
    onBillingChange,
    subscriptionStatus,
    activeOrgSlug,
}: PricingCardsProps) {
    return (
        <div className="mt-4 p-8">
            <div className="flex flex-col divide-y divide-ds-surface-border rounded-lg border border-ds-surface-border bg-ds-surface lg:hidden">
                {plans.map((plan) => {
                    const isHighlighted = plan.name.toLowerCase() === highlightedPlan
                    return (
                        <section key={plan.name} className="flex flex-col p-6">
                            <PricingCardContent
                                activeOrgSlug={activeOrgSlug}
                                billingPeriod={billingPeriod}
                                isHighlighted={isHighlighted}
                                onBillingChange={onBillingChange}
                                plan={plan}
                                lang={lang}
                                subscriptionStatus={subscriptionStatus}
                            />
                        </section>
                    )
                })}
            </div>
            <div
                className="hidden rounded-lg border border-ds-surface-border bg-ds-surface lg:grid"
                style={{ gridTemplateColumns: `repeat(${plans.length}, 1fr)` }}
            >
                {plans.map((plan) => {
                    const isHighlighted = plan.name.toLowerCase() === highlightedPlan

                    if (isHighlighted) {
                        return (
                            <section
                                key={plan.name}
                                className="relative z-10 -mt-4 -mb-8 flex flex-col rounded-lg bg-ds-surface shadow-pricing ring-[1.1px] ring-ds-blue-700"
                                style={{ padding: "40px 24px 56px 24px" }}
                            >
                                <PricingCardContent
                                    activeOrgSlug={activeOrgSlug}
                                    billingPeriod={billingPeriod}
                                    isHighlighted={true}
                                    onBillingChange={onBillingChange}
                                    plan={plan}
                                    lang={lang}
                                    subscriptionStatus={subscriptionStatus}
                                />
                            </section>
                        )
                    }

                    return (
                        <section key={plan.name} className="flex flex-col p-6">
                            <PricingCardContent
                                activeOrgSlug={activeOrgSlug}
                                billingPeriod={billingPeriod}
                                isHighlighted={false}
                                onBillingChange={onBillingChange}
                                plan={plan}
                                lang={lang}
                                subscriptionStatus={subscriptionStatus}
                            />
                        </section>
                    )
                })}
            </div>
        </div>
    )
}
