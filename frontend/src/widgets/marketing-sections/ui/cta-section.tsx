import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { ArrowChevron } from "@/shared/ui/icons/arrow-chevron"

interface CtaSectionProps {
    lang: string
}

export function CtaSection({ lang }: CtaSectionProps) {
    const { t } = useTranslation()

    return (
        <div className="relative z-[10000] flex w-full items-end justify-start overflow-hidden bg-ds-blue-700 px-8 pb-12 sm:px-4">
            <div className="container relative z-10 flex h-auto flex-col items-start justify-end gap-8 rounded-full py-12 text-ds-fg sm:h-[360px] sm:flex-row sm:items-end sm:justify-between sm:gap-0">
                <h2 className="w-fit text-left font-semibold text-4xl text-ds-surface leading-[1.2] sm:text-5xl lg:text-6xl">
                    {t("cta.startYour")}
                    <br />
                    {t("cta.freeTrial")}
                </h2>
                {/* Mobile: Button with text */}
                <Link
                    to="/$lang/pricing"
                    params={{ lang }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ds-surface font-medium text-base text-ds-blue-700 sm:hidden"
                >
                    {t("cta.startFreeTrial", { defaultValue: "Start free trial" })}
                    <ArrowChevron className="size-5 text-ds-blue-700" />
                </Link>
                {/* Desktop: Icon button */}
                <Link
                    to="/$lang/pricing"
                    params={{ lang }}
                    className="group hidden h-18 w-40 items-center justify-center rounded-full bg-ds-surface sm:flex"
                >
                    <ArrowChevron className="size-9 text-ds-blue-700" />
                </Link>
            </div>
        </div>
    )
}
