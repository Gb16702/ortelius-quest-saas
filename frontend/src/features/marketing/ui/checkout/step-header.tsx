import { ChevronLeft } from "lucide-react"
import { useTranslation } from "react-i18next"
import { TOTAL_STEPS } from "../../model/checkout"

interface StepHeaderProps {
    step: number
    titleKey: string
    titleDefault: string
    subtitleKey: string
    subtitleDefault: string
    onBack?: () => void
    hideStepIndicator?: boolean
}

export function StepHeader({
    step,
    titleKey,
    titleDefault,
    subtitleKey,
    subtitleDefault,
    onBack,
    hideStepIndicator = false,
}: StepHeaderProps) {
    const { t } = useTranslation()

    return (
        <>
            {!hideStepIndicator && (
                <div className="mb-2 flex items-center gap-1">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="-ml-2 rounded-full p-1 text-ds-fg-muted transition-colors hover:text-ds-fg"
                            aria-label={t("checkout.back", { defaultValue: "Back" })}
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                    )}
                    <p className="text-ds-fg-muted text-sm">
                        {t("checkout.stepLabel", {
                            defaultValue: "Step {{current}} of {{total}}",
                            current: step,
                            total: TOTAL_STEPS,
                        })}
                    </p>
                </div>
            )}
            <h1 className="mb-2 font-semibold text-xl lg:text-2xl">
                {t(titleKey, { defaultValue: titleDefault })}
            </h1>
            <p className="mb-6 text-ds-fg-muted">
                {t(subtitleKey, { defaultValue: subtitleDefault })}
            </p>
        </>
    )
}
