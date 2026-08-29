import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { FeatureKey, Plan } from "@/entities/subscription"
import { type CategoryKey, FEATURE_CATEGORIES } from "@/entities/subscription"
import { planHasFeature } from "./plan-has-feature"

interface FeatureComparisonProps {
    plans: Plan[]
}

export function FeatureComparison({ plans }: FeatureComparisonProps) {
    const { t } = useTranslation()

    const categories = Object.entries(FEATURE_CATEGORIES) as [CategoryKey, FeatureKey[]][]

    return (
        <div className="px-8 lg:px-0">
            <div className="space-y-8 lg:hidden">
                {categories.map(([categoryKey, featureKeys]) => (
                    <div key={categoryKey}>
                        <div className="space-y-4">
                            {featureKeys.map((featureKey) => (
                                <div
                                    key={featureKey}
                                    className="border-ds-surface-border border-b border-dashed pb-6"
                                >
                                    <div className="mb-4 font-semibold text-ds-fg text-sm">
                                        {t(`pricing.comparison.features.${featureKey}`, {
                                            defaultValue: featureKey,
                                        })}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {plans.map((plan) => {
                                            const included = planHasFeature(plan, featureKey)
                                            return (
                                                <div
                                                    key={plan.name}
                                                    className="flex items-center justify-between text-sm"
                                                >
                                                    <span className="text-ds-fg">
                                                        {t(
                                                            `pricing.plans.${plan.name.toLowerCase()}`,
                                                            {
                                                                defaultValue: plan.name,
                                                            }
                                                        )}
                                                    </span>
                                                    <span className="text-ds-fg-subtle">
                                                        {included ? (
                                                            <Check className="size-4 text-ds-blue-700" />
                                                        ) : (
                                                            "\u2014"
                                                        )}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="relative hidden lg:block">
                {categories.map(([categoryKey, featureKeys]) => (
                    <div key={categoryKey} className="mb-20">
                        <div className="sticky top-16 z-20 grid grid-cols-4 border-ds-surface-border border-b bg-ds-surface py-5">
                            <span className="font-semibold text-ds-fg text-lg">
                                {t(`pricing.comparison.categories.${categoryKey}`, {
                                    defaultValue: categoryKey,
                                })}
                            </span>
                            {plans.map((plan) => (
                                <div key={plan.name} className="px-6 text-start">
                                    <span className="font-medium text-ds-fg text-sm">
                                        {t(`pricing.plans.${plan.name.toLowerCase()}`, {
                                            defaultValue: plan.name,
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {featureKeys.map((featureKey) => (
                            <div
                                key={featureKey}
                                className="grid grid-cols-4 border-ds-surface-border border-b border-dashed py-5"
                            >
                                <div className="font-medium text-ds-fg text-sm">
                                    {t(`pricing.comparison.features.${featureKey}`, {
                                        defaultValue: featureKey,
                                    })}
                                </div>
                                {plans.map((plan) => (
                                    <div key={plan.name} className="px-6 text-start">
                                        {planHasFeature(plan, featureKey) && (
                                            <Check className="size-4 text-ds-blue-700" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
