import { Bell, Check, LockKeyholeOpen } from "lucide-react"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

interface TimelineItemProps {
    icon: React.ReactNode
    title: string
    description: string
    delay?: number
}

function TimelineItem({ icon, title, description, delay = 0 }: TimelineItemProps) {
    return (
        <motion.div
            className="relative flex items-start gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3, ease: "easeOut" }}
        >
            <div className="relative z-10 flex size-6 items-center justify-center rounded-full bg-ds-surface text-ds-fg">
                {icon}
            </div>
            <div className="flex-1 pt-0.5">
                <p className="font-medium text-base text-ds-fg">{title}</p>
                <p className="mt-0.5 text-ds-fg-muted text-xs">{description}</p>
            </div>
        </motion.div>
    )
}

interface TrialTimelineProps {
    trialDays: number
    lang: string
}

export function TrialTimeline({ trialDays, lang }: TrialTimelineProps) {
    const { t } = useTranslation()

    if (trialDays <= 0) return null

    const reminderDay = Math.max(1, trialDays - 2)

    const formatTrialDate = (daysFromNow: number) => {
        const date = new Date()
        date.setDate(date.getDate() + daysFromNow)
        return new Intl.DateTimeFormat(lang, {
            month: "short",
            day: "2-digit",
        }).format(date)
    }

    const reminderDate = formatTrialDate(reminderDay)
    const endDate = formatTrialDate(trialDays)

    return (
        <div className="flex-1">
            <p className="mb-4 font-normal text-ds-fg text-sm">
                {t("checkout.trialTimeline.title", {
                    defaultValue: "How your free trial works",
                })}
            </p>

            <div className="relative">
                <div className="absolute top-3 bottom-12 left-[11px] w-0.5 border-ds-control-border border-l border-dashed" />

                <div className="space-y-6">
                    <TimelineItem
                        icon={<LockKeyholeOpen className="size-3.5" strokeWidth={2} />}
                        title={t("checkout.trialTimeline.today", { defaultValue: "Today" })}
                        description={t("checkout.trialTimeline.todayDesc", {
                            defaultValue: "Full access to all features",
                        })}
                    />

                    <TimelineItem
                        icon={<Bell className="size-3.5" strokeWidth={2} />}
                        title={reminderDate}
                        description={t("checkout.trialTimeline.reminderDesc", {
                            defaultValue: "Get a reminder before trial ends",
                        })}
                        delay={0.15}
                    />

                    <TimelineItem
                        icon={<Check className="size-3.5" strokeWidth={2} />}
                        title={endDate}
                        description={t("checkout.trialTimeline.endDesc", {
                            defaultValue: "Your subscription begins",
                        })}
                        delay={0.3}
                    />
                </div>
            </div>
        </div>
    )
}
