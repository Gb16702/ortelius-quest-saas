import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/class-names"
import { DottedLines } from "@/shared/ui/dotted-lines"

const FAQ_KEYS = [
    "freeTrial",
    "changePlan",
    "paymentMethods",
    "trialEnds",
    "annualDiscount",
] as const

export function FaqSection() {
    const { t } = useTranslation()
    const [openIndexes, setOpenIndexes] = useState<Set<number>>(new Set())

    const toggleIndex = (index: number) => {
        setOpenIndexes((prev) => {
            const next = new Set(prev)
            if (next.has(index)) {
                next.delete(index)
            } else {
                next.add(index)
            }
            return next
        })
    }

    return (
        <div className="relative w-full bg-ds-surface">
            <DottedLines
                bottom={{ fadeStart: "7rem", fadeEnd: "7rem", overflow: "0rem" }}
                color="gray-900"
            />

            <div className="container relative mx-auto px-8 py-12 sm:py-24">
                <DottedLines
                    left={{ fadeStart: "0rem", fadeEnd: "0rem", overflow: "0rem" }}
                    right={{ fadeStart: "0rem", fadeEnd: "0rem", overflow: "0rem" }}
                    color="gray-900"
                />

                <h2 className="mb-12 max-w-xs text-start font-bold text-3xl text-ds-fg sm:max-w-full sm:text-center sm:text-4xl">
                    {t("pricing.faq.title", {
                        defaultValue: "Frequently asked questions",
                    })}
                </h2>

                <div className="mx-auto max-w-3xl">
                    {FAQ_KEYS.map((key, index) => {
                        const isOpen = openIndexes.has(index)
                        return (
                            <div key={key} className="border-ds-surface-border border-b">
                                <button
                                    type="button"
                                    onClick={() => toggleIndex(index)}
                                    className="flex w-full items-center justify-between py-6 text-left"
                                >
                                    <span className="pr-8 font-medium text-base text-ds-fg">
                                        {t(`pricing.faq.${key}.question`)}
                                    </span>
                                    <ChevronDown
                                        className={cn(
                                            "size-5 shrink-0 text-ds-fg-subtle transition-transform duration-200",
                                            isOpen && "rotate-180"
                                        )}
                                    />
                                </button>
                                <div
                                    className={cn(
                                        "grid transition-all duration-200",
                                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                    )}
                                >
                                    <div className="overflow-hidden">
                                        <p className="pb-6 text-base text-ds-fg-muted leading-relaxed">
                                            {t(`pricing.faq.${key}.answer`)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
